---
title: JVM--从JVM层面深入解析对象实例化、多态性实现机制
date: 2018-01-08 18:24:57
tags:
    - 多态性
    - JVM
categories: JVM
---

之前一直觉得对于字节码的执行过程，对象的实例化过程，多态的实现机制没有进行深刻的探讨，只是进行了简单的总结，一直也苦于没有找到恰当的例子，所幸今天看到一前辈的博客，对其进行钻研之后，终于解决了这个历史遗留问题。

**首先贴出前辈的原文链接，并且这篇博客会引用其中的一些内容：[Java重写方法与初始化的隐患](https://www.jianshu.com/p/cdc5adb40bb7)**


----------
## **问题的还原**

先来看一份代码：

```java
public class SuperClass {

    private int mSuperX;
    
    public SuperClass() {
        setX(99);
    }

    public void setX(int x) {
        mSuperX = x;
    }
}
```

```java
public class SubClass extends SuperClass {

    private int mSubX = 1;

    public SubClass() {}

    @Override
    public void setX(int x) {
        super.setX(x);
        mSubX = x;
        System.out.println("mSubX is assigned " + x);
    }

    public void printX() {
        System.out.println("mSubX = " + mSubX);
    }
}
```

最后在main里调用：

```java
public class Main {
    public static void main(String[] args) {
        SubClass sc = new SubClass();
        sc.printX();
    }
}
```

如果你认为答案是这样的：

```
mSubX is assigned 99
mSubX = 99
```

那么请继续往下看，因为真实的答案是这样的：

```
SubX is assigned 99
SubX = 1
```


----------
## **实际分析**
### **方法重写所产生的影响及其JVM层面的原因**

我觉得首先要给大家说一件非常重要的事情：

SuperClass构造器中的这个方法调用，事实会调用重写后的方法，也就是SubClass中的setX方法。

```java
    public SuperClass() {
        setX(99);
    }

	// 事实调用的是 SubClass 中的setX方法
	@Override
    public void setX(int x) {
        super.setX(x);
        mSubX = x;
        System.out.println("SubX is assigned " + x);
    }
```

要想知道发生了什么，最简单的方法就是看看到底程序到底是怎么执行的，比如单步调试，或者直接一点，看看Java字节码。

下面是Main的字节码：

```java
Compiled from "Main.java"
public class bugme.Main {
  ......
  public static void main(java.lang.String[]);
    Code:
       0: new           #2                  // class bugme/SubClass
       3: dup           
       4: invokespecial #3                  // Method bugme/SubClass."<init>":()V
       ......  
}
```

这段代码首先new一个SubClass实例, 把引用入栈, dup是把栈顶复制一份再入栈, invokespecial # 3将栈顶元素出栈并调用它的某个方法, 这个方法具体是什么要看常量池里第3个条目是什么, 但是javap生成的字节码直接给我们写在旁边了, 即SubClass.&lt;init&gt;。

接下来看SubClass.&lt;init&gt;：

```java
public class bugme.SubClass extends bugme.SuperClass {
  public bugme.SubClass();
    Code:
       0: aload_0       
       1: invokespecial #1                  // Method bugme/SuperClass."<init>":()V
       ......
```

好了，先看到这，我们来解决几个问题：

> 1. new指令之后为什么需要dup指令（操作数栈中为什么会有两个指向SubClass的引用）
> 2. &lt;init&gt;方法是什么

**首先来解决第一个问题**：

分析一下mian方法的执行顺序吧：

1) 其中new指令在java堆上为SubClass对象分配内存空间，并将指向其地址的引用压入操作数栈顶；
2) 然后dup指令为复制操作数栈顶值，并将其压入栈顶，也就是说此时操作数栈上有连续相同的两个引用；
3) invokespecial指令调用实例初始化方法&lt;init&gt;:()V，所以需要从操作数栈顶弹出一个this引用，也就是说这一步会弹出一个之前入栈的引用；
4) `sc.printX()`也需要从操作数栈顶取出一个引用类型的值，进行使用；
5) 最后由return指令结束方法。

main方法后面的字节码没有贴出，大家可以使用javap命令进行查看。

从上面的五个步骤中可以看出，需要从栈顶弹出两个实例对象的引用，这就是为什么会在new指令下面有一个dup指令，其实对于每一个new指令来说一般编译器都会在其下面生成一个dup指令，这是因为实例的初始化方法肯定需要用到一次，然后第二个留给程序员使用，例如给变量赋值，调用方法，抛出异常等，如果我们不用，那编译器也会生成dup指令，在初始化方法调用完成后再从栈顶pop出来。

**再来解决第二个问题**：

我曾经在JVM的其他篇章讲述过&lt;clinit&gt;，如果你对类构造器还不是很清楚，可以翻翻我以前的JVM相关博客或Baidu一下相关资料。

如果你清楚&lt;clinit&gt;，那么&lt;init&gt;与其是相类似的，其名为实例构造器，其实对于实例构造器，我们在之前也做过相关的介绍，但我还是要再次总结。

首先要清楚，我们平常所说的对象的构造方法实际上只是&lt;init&gt;的一个真子集。这是Java帮我们合成的一个方法, **里面的指令会帮我们按顺序进行普通成员变量初始化, 也包括初始化块里的代码, 注意是按顺序执行, 这些都执行完了之后才轮到构造方法里代码生成的指令执行。**

但是一般来说，我们都是将成员变量的初始化放在构造方法中，所以**&lt;init&gt;事实上就是将实例代码块中的代码放在对超类构造方法的调用语句之后（super方法），对象自身的构造方法之前合并所产生的一块代码。**

**对&lt;init&gt;方法的介绍在这篇博客中也有：[JVM--详解创建对象与类加载的区别与联系](http://blog.csdn.net/championhengyi/article/details/78778575)**

因此我们平常所记忆的关于对象实例化的顺序是这样：父类&lt;clinit&gt; ---> 子类&lt;clinit&gt; ---> 父类实例块代码 ---> 父类构造方法 ---> 子类实例块代码 ---> 子类构造方法

现在我们可以对其实例化的顺序进行简化：父类&lt;clinit&gt; ---> 子类&lt;clinit&gt; ---> 父类&lt;init&gt;  ---> 子类&lt;init&gt;

刚才说到JVM在处理了new指令、dup指令之后首先调用了SubClass.&lt;init&gt;，我们也解释了&lt;init&gt;构造器。从前面说的我们知道了在&lt;init&gt;构造器中的一个指令就是对父类&lt;init&gt;构造器的调用，结合上面所贴的`SubClass.<init>`字节码，aload_0就将局部变量表中下标为0的元素入栈, 其实就是Java中的this, 结合`invokespecial #1`, 是在调用父类的&lt;init&gt;构造器。（**注意这里调用父类构造器的this代表是SubClass**）

解释了所有的问题之后，让我们再继续看SuperClass.&lt;init&gt;：

```java
public class bugme.SuperClass {
  public bugme.SuperClass();
    Code:
       0: aload_0       
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: aload_0       
       5: bipush        99
       7: invokevirtual #2                  // Method setX:(I)V
      10: return  
      
  ......     
}
```

同样是先调了父类Object的&lt;init&gt;构造器, 然后再将this, 99入栈, invokevirtual #2旁边注释了是调用setX, 参数分别是this和99也就是this.setX(99)，最后是return指令，方法结束。

博主当初看到这里的时候，又产生了一个疑惑，为什么JVM会调用重写后的方法，在父类中使用的是`this.setX(99)`进行调用，JVM是怎么找到重写后方法的入口的？

事实上博主之前认为this代表的是当前对象，方法在哪个对象中，this就代表哪个对象。

如果你和博主有一样的疑惑，那么你也应该好好了解一下this这个关键字了。问题就出在对this的理解上。博主目前并没有找到官方的说法，但是经过代码验证之后，SuperClass中的this表示的还是SubClass。并且在JavaScript中对于this调用是这样描述的：**一个方法由哪个对象调用，这个方法所属的对象就是this。**

**这个方法被谁调用，这个this就是谁**。可以好好体会这句话。

**博主一直以为，this仅代表着当前对象。但是事实看来好像并不如此**。由于是在子类构造器中调用的父类构造器，因此父类中的this代表的也是SubClass。甚至，我现在基本可以肯定，在SuperClass中对Object类的调用，也是SubClass。

那么事情已经变得简单了。既然已经确定了this，那么运用我们之前所说的动态分派知识，也可以明白为什么调用父类构造器中的setX方法会对应至子类的setX方法。

但是内容还不止于此... ...

在和学长讨论之后，并且重新翻阅了分派那一节的内容之后，我觉得多态从本质上来说是根据当前栈帧上操作数栈顶引用所代表的实际类型来进行方法的查找，而不能简单的理解为根据方法接受者的实际类型来进行判断（那只是从我们程序员的角度来说）。正如我们上面分析的那样。

怎么理解“**当前栈帧上操作数栈顶引用所代表的实际类型**”呢？等下再说明这个问题。

昨天跟学长的讨论中觉得对多态的浅显认识可以这样理解：

> 当初始化子类的时候，所有子类继承的父类，父类的父类的方法都被子类所拥有，而因为子类可以重写父类的方法，所以被重写的方法就不会有体现。

我对其进行了一点补充：“相当于JVM把父类方法隐藏了，只有通过super.xxx()显式调用才能调用父类方法”。

如果你不想刨根问底，对于多态这样理解的话，我觉得也无可厚非。但是我们需要从JVM层面来考虑一下JVM到底是怎么找到重写后方法的地址入口而将父类方法的地址入口给隐藏了。

在之前我讲多态性实现机制的时候，我遗漏了一个非常重要的东西**invokevirtual指令**，因为当初没有学习JVM指令集，所以直接将这一部分知识略过了，这也导致了我当初对于多态的实现机制一知半解，就直接带大家上车了。

现在我来详细说一下invokevirtual指令的多态查找过程：

1. 找到操作数栈顶的第一个元素所指向的对象的实际类型，记做C；
2. 如果在C中找到与常量中的描述符和简单名称都相符的方法，则进行访问权限校验，如果通过则返回这个方法的直接引用；不通过则抛出IllegalAccessError异常；
3. 否则，按照继承关系从下往上依次对C的各个父类进行第二步的搜索和验证过程；
4. 如果始终没有找到合适的方法，就抛出AbstractMethodError异常。

而上述步骤就是Java语言中方法重写的本质，而这种在运行期根据实际类型（对应步骤一）确定方法执行版本的分派过程就是**动态分派**！！！

那么我们回到刚才所讨论的代码上，要找到当前栈帧上操作数栈顶引用所代表的实际类型，看一下上面贴出的SuperClass.&lt;init&gt;的字节码。我们发现在调用setX方法之前，对操作数栈压入了this，又弹出this调用了Object的&lt;init&gt;构造器，之后又压入了99和this，此时操作数栈顶引用this所代表的实际类型就是subClass（上面已经进行了验证）。根据动态分派的原理，最后会调用SubClass中的setX方法，也就是重写后的方法。

### **对象实例化的顺序对运行结果所产生的影响**

上面所述将这篇博客的主要内容已经阐述清楚，但是还有一个问题，我们明白了在子类重写父类方法之后JVM为什么会调用重写后的方法，但是还没有说明程序运行结果的原因。

让我们继续来看Java字节码，调用重写setX方法中的字节码：

```java
public class bugme.SubClass extends bugme.SuperClass {
  ......
  public void setX(int);
    Code:
       0: aload_0       
       1: iload_1       
       2: invokespecial #3                  // Method bugme/SuperClass.setX:(I)V
       ......
}
```

这里将局部变量表前两个元素都入栈, 第一个是this, 第二个是括号里的参数, 也就是99, invokespecial #3调用的是父类的setX, 也就是我们代码中写的super.setX(int)。

SuperClass.setX就很简单了:

```java
public class bugme.SuperClass {
  ......     
  public void setX(int);
    Code:
       0: aload_0       
       1: iload_1       
       2: putfield      #3                  // Field mSuperX:I
       5: return        
}
```

这里先把this入栈, 再把参数入栈, putfield #3使得前两个入栈的元素全部出栈, 而成员mSuperX被赋值, 这四条指令只对应代码里的一句this.mSuperX = x。

接下来控制流回到子类的setX：

```java
public class bugme.SubClass extends bugme.SuperClass {
  ......
  public void setX(int);
    Code:
       0: aload_0       
       1: iload_1       
       2: invokespecial #3                  // Method bugme/SuperClass.setX:(I)V
    -->5: aload_0                           // 即将执行这句
       6: iload_1       
       7: putfield      #2                  // Field mSubX:I
      10: getstatic     #4                  // Field java/lang/System.out:Ljava/io/PrintStream;
      13: new           #5                  // class java/lang/StringBuilder
      16: dup           
      17: invokespecial #6                  // Method java/lang/StringBuilder."<init>":()V
      20: ldc           #7                  // String SubX is assigned 
      22: invokevirtual #8                  // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
      25: iload_1       
      26: invokevirtual #9                  // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
      29: invokevirtual #10                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
      32: invokevirtual #11                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      35: return
}
```

现在应该从上面所指向的5处开始执行了，5,6,7将参数的值赋给mSubX, 此时mSubX是99了, 下面那一堆则是在执行System.out.println("mSubX is assigned " + x);并返回, 还可以看到Java自动帮我们使用StringBuilder优化字符串拼接, 就不分析了。

都分析到这里了，你也许都会说，子类中的mSubX就是99啊，没毛病。为什么最后答案是1呢？

你也许忘了，好好想一想刚才程序所走的流程---是不是才将父类中&lt;init&gt;构造器流程走完啊。子类初始化，调用父类的&lt;init&gt;，父类的&lt;init&gt;中调用了子类的setX方法，此时mSubX等于99，剩下的子类&lt;init&gt;还没有执行呢！而我们刚才也说了，&lt;init&gt;中包括了实例变量的初始化，因此在执行子类的&lt;init&gt;过程中把1赋给mSubX, 99被1覆盖了。这就是产生最后运行结果的真相！

我们还可以再对照SubClass的字节码进行查看，刚才并没有将SubClass的字节码分析完毕：

```java
public class bugme.SubClass extends bugme.SuperClass {
  public bugme.SubClass();
    Code:
       0: aload_0       
    -->1: invokespecial #1                  // Method bugme/SuperClass."<init>":()V
       4: aload_0       
       5: iconst_1      
       6: putfield      #2                  // Field mSubX:I
       9: return        

  ......      
}
```

我们刚才分析到1处就去分析SuperClass中的&lt;init&gt;构造器了，此时mSubX已经是99了, 再执行下面的4,5,6, 将this入栈，将变量1入栈，将1赋值给this.mSubX，这一部分才是SubClass的初始化, 代码将1赋给mSubX, 99被1覆盖了。

最后return指令将方法返回，才相当于我们执行完了箭头指的这一句代码：

```java
public class Main {
    public static void main(String[] args) {
     -->SubClass sc = new SubClass();
        sc.printX();
    }
}
```

接下来执行的代码将打印mSubX的值, 自然就是1了。

我们基本上将这份代码所产生的字节码文件分析了一遍，相信大家应该有一份额外的感受---JVM真的是基于栈执行的啊！原来这就是基于栈的指令集。

好了，这篇博客到此结束，自认为干货满满，非常有成就感，如果大家在阅读的过程有什么疑惑，欢迎大家留言讨论交流~~


----------
## **参考阅读**

《深入理解Java虚拟机》-- 周志明

[java虚拟机指令dup的理解](http://www.apkbj.com/language/show-21398.html)

[Java重写方法与初始化的隐患](https://www.jianshu.com/p/cdc5adb40bb7)