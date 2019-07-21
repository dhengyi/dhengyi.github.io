---
title: Java并发--DCL双检查锁机制中的volatile
date: 2017-08-29 14:14:58
tags:
    - 并发
    - 单例模式
    - DCL双检查
    - volatile关键字
categories: Java并发
---

作为被面试官最喜欢问到的23种设计模式之一，我们不得不熟练掌握单例模式以及洞悉多线程环境下，单例模式所存在的非线程安全问题以及它的解决方式。

注：这篇文章主要讲述多线程环境下单例模式存在的非线程安全问题，并不详细讲述单例模式。


----------
## **何为单例模式**

首先我们先大概了解一下单例模式的定义：

> - 单例类只能有一个实例。
> - 单例类必须自己创建自己的唯一实例。
> - 单例类必须给所有其他对象提供这一实例。

单例模式的应用非常广泛，例如在计算机系统中，线程池、缓存、日志对象、对话框、打印机、显卡的驱动程序对象常被设计成单例。这些应用都或多或少具有资源管理器的功能。每台计算机可以有若干个打印机，但只能有一个Printer Spooler，以避免两个打印作业同时输出到打印机中。选择单例模式就是为了避免不一致状态。

单例模式的实现有三种方式：饿汉式（天生线程安全），懒汉式，登记式（可忽略）。

对于上面单例模式的实现方式我在这里不做过多介绍，我们着重来看一下懒汉式在多线程环境下出现的问题以及它的解决策略。


----------
## **设计线程安全的单例模式**
### **DCL双检查锁机制**

其实我觉得能看这篇文章的伙伴们对设计线程安全的单例模式都是有一定的了解，所以对于解决非线程安全的单例模式的3种方式也应该有些了解。我们再来总结一下这三种方式：声明synchronized关键字（同步代码块），DCL双检查锁机制，静态内置类的实现。

关于第一种方式，我觉得大家应该没有什么疑惑，所以我在这里也就不再讲述了，咱们来看一下我在学习双检查锁机制过程中遇到的问题，是否和你一样。

这是单例类，注意`private volatile static MyObject myObject`这句话。

```java
public class MyObject {
    private volatile static MyObject myObject;

    private MyObject() {

    }

    public static MyObject getInstance() {
        try {
            if (myObject != null) {

            } else {
                // 模拟在创建对象之前做的一些准备工作
                Thread.sleep(3000);
                synchronized (MyObject.class) {
                    if (myObject == null) {
                        myObject = new MyObject();
                    }
                }
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        return myObject;
    }
}
```

线程类：

```java
public class MyThread extends Thread {
    @Override
    public void run() {
        out.println(MyObject.getInstance().hashCode());
    }
}
```

测试类：

```java
public class Run {
    public static void main(String[] args) {
        MyThread thread1 = new MyThread();
        MyThread thread2 = new MyThread();
        MyThread thread3 = new MyThread();

        thread1.start();
        thread2.start();
        thread3.start();
    }
}
```

最终结果：

```
773715418
773715418
773715418
```

我们可以看到，使用了Double-Check，使得在多线程环境下，也只能取得类的唯一实例。但是不知道你有没有和我一样的疑惑，看我上面着重提出来的那句话，我们为什么在声明MyObject对象的时候还要给它加上volatile关键字？我们在Double-Check下已经加入了synchronized关键字，既然synchronized已经起到了多线程下原子性、有序性、可见性的作用，为什么还要加volatile呢？要解决这个问题，我们需要深入了解volatile关键字的特性，它不仅可以使变量在多个线程之间可见，而且它还具有禁止JVM进行指令重排序的功能，具体请参见[JVM--从volatile深入理解Java内存模型](http://blog.csdn.net/championhengyi/article/details/77151002)这篇文章。

首先，我们需要明白的是：创建一个对象可以分解为如下的3行伪代码：

```java
memory=allocate();      // 1.分配对象的内存空间
ctorInstance(memory);   // 2.初始化对象
instance=memory;        // 3.设置instance指向刚分配的内存地址。

// 上面3行代码中的2和3之间，可能会被重排序导致先3后2
```

也就是说，`myObject = new MyObject()`这句话并不是一个原子性操作，在多线程环境下有可能出现非线程安全的情况。

现在我们先假设一下，如果此时不设置volatile关键字会发生什么。

假设两个线程A、B，都是第一次调用该单例方法，线程A先执行`myObject = new MyObject()`，该构造方法是一个非原子操作，编译后生成多条字节码指令，由于JAVA的指令重排序，可能会先执行myObject的赋值操作，该操作实际只是在内存中开辟一片存储对象的区域后直接返回内存的引用，之后myObject便不为空了，但是实际的初始化操作却还没有执行，如果就在此时线程B进入，就会看到一个不为空的但是不完整（没有完成初始化）的MyObject对象，所以需要加入volatile关键字，禁止指令重排序优化，从而安全的实现单例。

因此我们以后应该记得，在使用Double-Check的时候，那个volatile至关重要。并不是可要可不要的。