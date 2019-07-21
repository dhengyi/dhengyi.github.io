---
title: Java并发--详解this与Thread.currentThread()的区别
date: 2017-08-04 10:15:20
tags:
    - 并发
categories: Java并发
---

**注：本系列博客参考《Java多线程编程核心技术》，主要是对书上的知识点进行总结，并记录学习过程。**

一直对并发这块比较感兴趣，也到了系统学习Java多线程的时间。目前所学习的书籍是《Java多线程编程核心技术》，买回来之后听说这本书不怎么样，豆瓣评分也就7点几，目前读完了第一章，感觉确实不是很好，但是也不算太坑，总的来说还是可以入手的。好了，废话不多说，开始正题。


----------
首先我们来看一份代码：

```java
public class CountOperate extends Thread {
    public CountOperate() {
        out.println("CountOperate---begin");
        out.println("Thread.currentThread.getName()=" + Thread.currentThread().getName());
        out.println("this.name()=" + this.getName());
        out.println("Thread.currentThread()==this :"+ (Thread.currentThread() == this));
        out.println("CountOperate---end");
    }

    @Override
    public void run() {
        out.println("run begin");
        out.println("Thread.currentThread().getName()=" + Thread.currentThread().getName());
        out.println("this.getName=" + this.getName());
        out.println("Thread.currentThread()==this :"+ (Thread.currentThread() == this));
        out.println("run---end");
    }
}
```

```java
public class Run {
    public static void main(String[] args) {
        CountOperate countOperate = new CountOperate();
        Thread thread = new Thread(countOperate);

        thread.setName("A");
        thread.start();
    }
}
```

来看一下运行结果是否符合你的预期：

```
CountOperate---begin
Thread.currentThread.getName()=main
this.name()=Thread-0
Thread.currentThread()==this :false
CountOperate---end

run begin
Thread.currentThread().getName()=A
this.getName()=Thread-0
Thread.currentThread()==this :false
run---end
```

在还没有启动CountOperate线程的时候，调用这段代码的是main线程，所以：

```java
Thread.currentThread.getName()=main
```

这是正常的，但是 `this.name()=Thread-0` 这是个什么东西？看一下Thread源码吧：

```java
public Thread() {
	init(null, null, "Thread-" + nextThreadNum(), 0);
}
```

参数的含义不明确？好，我们再来看一下init方法的声明：

```java
 private void init(ThreadGroup g, Runnable target, String name, long stackSize);
```

来解释一下各个参数的含义：

> - ThreadGroup: 线程组
> - Runnable target: **the object whose {@code run} method is invoked when this thread is started. If {@code null}, this thread's run method is invoked.** （源码解释，建议百度翻译，也是产生this和Thread.currentThread区别的原因）**因为在Thread源码中，Thread实际上操作了Runable，所以此参数也接受Thread对象，也就是说此参数也可以是继承了Thread的线程类**
> - String name: 线程名
> - long stackSize: 新线程所需的堆栈大小，或0表示该参数将被忽略。

这下，我们知道Thread-0是怎么来的了，String name生成名称的规则是：“Thread-”加上创建的线程的个数（第几个）。默认从0开始，main线程是默认就有的，所以并不计数。

然后 `Thread.currentThread()==this :false` 这个也好理解，this代表的是CountOperate对象实例，而`Thread.currentThread()` 得到的是main，所以为false。

代码继续向下执行... ...

重点来了：

```
Thread.currentThread().getName()=A
this.getName()=Thread-0
Thread.currentThread()==this : false
```

`Thread.currentThread().getName()` 得到的是执行这段代码的线程名，我们已经设置为了A，没问题。但是这里的`this.getName()=Thread-0`为什么没变？this代表的实例是什么？别着急，我们再来看一看源码：

```java
public Thread(Runnable target) {
	init(null, target, "Thread-" + nextThreadNum(), 0);
}
```

然后我们结合上面源码中target的注释再来看一看run方法的源码：

```java
public void run() {  
    if (target != null) {  
        target.run();  
    }  
}  
```

明白了吧？只要target不为空，那么它最后还是会调用target的run方法。是的，现在问题已经解决了！没反应过来？那我们回过头来看一下`Thread thread = new Thread(countOperate)`，从源码来讲，它最后还是会执行`countOperate.run()`，而this取得的就是代表当前实例的引用，所以，`this.getName()` 还是会打印Thread-0。那么最后一个false也就明白了，两个取得的都不是同一个对象，自然Thread.currentThread()和this也就不等了。