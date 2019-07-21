---
title: JVM--剖析类与对象在JVM中从生存至死亡
date: 2017-12-17 12:52:20
tags: 生命周期
categories: JVM
---

前面学习了Class文件结构、类的加载机制、字节码执行引擎、对象的创建与销毁，所以我准备从一个Java代码进行切入，详细剖析它的生命历程，将所学的知识真正的用起来，也算是对前面所学的知识进行一个系统的总结。


----------
我们以这份Java代码为例，来剖析一个Java程序的生命历程：

```java
interface ClassName {
    String getClassName();
}

class Company implements ClassName {
    String className;

    public Company(String className) {
        this.className = className;
    }

    @Override
    public String getClassName() {
       return className;
    }
}

public class Main {
    public static void main(String[] args) {
        String className;

        Scanner scanner = new Scanner(System.in);
        while (scanner.hasNext()) {
            className = scanner.next();
            Company company = new Company(className);
            System.out.println("name=" + company.getClassName());
        }
    }
}
```

可以看到，这份代码涉及到了接口，继承，对象的实例化，main方法，值得我们花费一些功夫去从JVM层面上了解这个程序从编译、运行到结束都发生了哪些事情。

所以，别急，让我们按顺序慢慢来分析。


----------
## **编译阶段**

首先你要运行一个java程序，肯定要对其进行编译，生成我们前面说的Class文件，这段代码会生成3个Class文件。

Class文件中保存了**魔数、版本符号、常量池、方法标志、类索引、父类索引、接口索引、字段表（有可能含有属性表）、方法表（有可能含有属性表）**等信息。这些信息具体的组成结构，我在这里不再赘述。

我们可以通过字节码文件，清晰的描述出Java源码中有关类的所有信息。

在这里只以Main类为例，使用javap命令看一下生成的Class文件。

```
javap -verbose Main;
```

```java
  Last modified 2017-12-13; size 852 bytes
  MD5 checksum 0336fa14cc04a9c858c34cc016880c19
  Compiled from "Main.java"
public class Main
  minor version: 0
  major version: 52
  flags: ACC_PUBLIC, ACC_SUPER
Constant pool:
   #1 = Methodref          #18.#29        // java/lang/Object."<init>":()V
   #2 = Class              #30            // java/util/Scanner
   #3 = Fieldref           #31.#32        // java/lang/System.in:Ljava/io/InputStream;
   #4 = Methodref          #2.#33         // java/util/Scanner."<init>":(Ljava/io/InputStream;)V
   #5 = Methodref          #2.#34         // java/util/Scanner.hasNext:()Z
   #6 = Methodref          #2.#35         // java/util/Scanner.next:()Ljava/lang/String;
   #7 = Class              #36            // Company
   #8 = Methodref          #7.#37         // Company."<init>":(Ljava/lang/String;)V
   #9 = Fieldref           #31.#38        // java/lang/System.out:Ljava/io/PrintStream;
  #10 = Class              #39            // java/lang/StringBuilder
  #11 = Methodref          #10.#29        // java/lang/StringBuilder."<init>":()V
  #12 = String             #40            // name=
  #13 = Methodref          #10.#41        // java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
  #14 = Methodref          #7.#42         // Company.getClassName:()Ljava/lang/String;
  #15 = Methodref          #10.#43        // java/lang/StringBuilder.toString:()Ljava/lang/String;
  #16 = Methodref          #44.#45        // java/io/PrintStream.println:(Ljava/lang/String;)V
  #17 = Class              #46            // Main
  #18 = Class              #47            // java/lang/Object
  #19 = Utf8               <init>
  #20 = Utf8               ()V
  #21 = Utf8               Code
  #22 = Utf8               LineNumberTable
  #23 = Utf8               main
  #24 = Utf8               ([Ljava/lang/String;)V
  #25 = Utf8               StackMapTable
  #26 = Class              #30            // java/util/Scanner
  #27 = Utf8               SourceFile
  #28 = Utf8               Main.java
  #29 = NameAndType        #19:#20        // "<init>":()V
  #30 = Utf8               java/util/Scanner
  #31 = Class              #48            // java/lang/System
  #32 = NameAndType        #49:#50        // in:Ljava/io/InputStream;
  #33 = NameAndType        #19:#51        // "<init>":(Ljava/io/InputStream;)V
  #34 = NameAndType        #52:#53        // hasNext:()Z
  #35 = NameAndType        #54:#55        // next:()Ljava/lang/String;
  #36 = Utf8               Company
  #37 = NameAndType        #19:#56        // "<init>":(Ljava/lang/String;)V
  #38 = NameAndType        #57:#58        // out:Ljava/io/PrintStream;
  #39 = Utf8               java/lang/StringBuilder
  #40 = Utf8               name=
  #41 = NameAndType        #59:#60        // append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
  #42 = NameAndType        #61:#55        // getClassName:()Ljava/lang/String;
  #43 = NameAndType        #62:#55        // toString:()Ljava/lang/String;
  #44 = Class              #63            // java/io/PrintStream
  #45 = NameAndType        #64:#56        // println:(Ljava/lang/String;)V
  #46 = Utf8               Main
  #47 = Utf8               java/lang/Object
  #48 = Utf8               java/lang/System
  #49 = Utf8               in
  #50 = Utf8               Ljava/io/InputStream;
  #51 = Utf8               (Ljava/io/InputStream;)V
  #52 = Utf8               hasNext
  #53 = Utf8               ()Z
  #54 = Utf8               next
  #55 = Utf8               ()Ljava/lang/String;
  #56 = Utf8               (Ljava/lang/String;)V
  #57 = Utf8               out
  #58 = Utf8               Ljava/io/PrintStream;
  #59 = Utf8               append
  #60 = Utf8               (Ljava/lang/String;)Ljava/lang/StringBuilder;
  #61 = Utf8               getClassName
  #62 = Utf8               toString
  #63 = Utf8               java/io/PrintStream
  #64 = Utf8               println
{
  public Main();
    descriptor: ()V
    flags: ACC_PUBLIC
    Code:
      stack=1, locals=1, args_size=1
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return
      LineNumberTable:
        line 27: 0

  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=3, locals=4, args_size=1
         0: new           #2                  // class java/util/Scanner
         3: dup
         4: getstatic     #3                  // Field java/lang/System.in:Ljava/io/InputStream;
         7: invokespecial #4                  // Method java/util/Scanner."<init>":(Ljava/io/InputStream;)V
        10: astore_2
        11: aload_2
        12: invokevirtual #5                  // Method java/util/Scanner.hasNext:()Z
        15: ifeq          63
        18: aload_2
        19: invokevirtual #6                  // Method java/util/Scanner.next:()Ljava/lang/String;
        22: astore_1
        23: new           #7                  // class Company
        26: dup
        27: aload_1
        28: invokespecial #8                  // Method Company."<init>":(Ljava/lang/String;)V
        31: astore_3
        32: getstatic     #9                  // Field java/lang/System.out:Ljava/io/PrintStream;
        35: new           #10                 // class java/lang/StringBuilder
        38: dup
        39: invokespecial #11                 // Method java/lang/StringBuilder."<init>":()V
        42: ldc           #12                 // String name=
        44: invokevirtual #13                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        47: aload_3
        48: invokevirtual #14                 // Method Company.getClassName:()Ljava/lang/String;
        51: invokevirtual #13                 // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
        54: invokevirtual #15                 // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
        57: invokevirtual #16                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        60: goto          11
        63: return
      LineNumberTable:
        line 31: 0
        line 32: 11
        line 33: 18
        line 34: 23
        line 35: 32
        line 36: 60
        line 37: 63
      StackMapTable: number_of_entries = 2
        frame_type = 253 /* append */
          offset_delta = 11
          locals = [ top, class java/util/Scanner ]
        frame_type = 51 /* same */
}

SourceFile: "Main.java"
```

我们大概分析一下上面的输出结果吧：

直接从常量池开始分析，前面的几行信息我认为没有分析的必要。

```java
#1 = Methodref          #18.#29        // java/lang/Object."<init>":()V
```

这是常量池里面的第一项数据，#1代表索引，Methodref告诉我们常量池中第一个索引表示的是一个方法引用，对这个方法引用的描述用常量池中第18项和第29项的内容可以进行描述，你们可以查一下常量池中第18项和第29项的内容，其实对应的就是后面注释的内容。它告诉了你这个方法所属的类是Object，方法的**简单名称**是&lt;init&gt;，方法的**描述符**是()V，也就是Object中的实例构造函数（对简单名称和描述符我在前面的博客中已经进行了说明）。

你也许想问，为什么Main类常量池中的第一项数据描述的是Object类中的无参构造函数？你可能忘了，所有类都应如此，Java中所有的类都继承自Object，常量池中也会保存他们父类的索引，因为在Java中，对象的初始化与实例化不是还有一条规则嘛---先初始化与实例化父类，然后才是子类（说的并不精确，明白我的意思就行）。

剩余的常量池分析与上面类似。

常量池下面的代码块，可以看到，一个Main类的默认构造函数，一个就是main方法了。关于这两个东西，我们等一下在字节码的执行阶段再说。

可以看到，Class文件中，包含着详细的信息，有大量的信息都是你无法从源码中直接得到的。


----------
## **类加载阶段**

javac对源文件编译完成，我们使用java命令开始运行这个Main类。**java命令只能运行包含main方法的类**。

java命令一开始运行，JVM开始对Main类进行**加载**。

这时候就对应了我们学习类加载机制的每个阶段：加载（从.class文件中读取字节码）、验证（对字节码文件进行一系列的验证保证格式无误并且对JVM不会产生危害）、准备（为类变量分配内存并进行系统初始化）、解析（分为静态链接与动态链接，非虚方法的符号引用会在这一阶段被解析为直接引用）、初始化（执行类构造器）。

我再对其过程进行一点点补充，如果想要更加详细的说明，请移步至我的博客专栏。

JVM在加载这个Main类的时候，使用**类加载器（双亲委派模型）**对其进行加载，经历了加载、验证（在这个时候又会**触发Object类的加载**）阶段，由于在Main类中并没有类变量，也就相当于跳过了准备这一阶段，然后对字节码进行解析，由于main方法是静态方法，也就是非虚方法，开始**静态链接**，在字节码中直接将main方法的符号引用解析为直接引用（别忘了Main类反编译之后的默认构造器～），由于没有静态变量与静态语句块，所以初始化这一阶段也相当于是直接跳过，最后整个加载过程完毕，并在方法区中生成Main类所对应的**Class对象**。

由于我这个例子中不涉及多态，也就不涉及**分派**，但这部分知识请务必掌握。


----------
## **方法执行阶段**

类中所有的信息已经在内存中加载完毕，JVM开始进行**方法调用**... ...

**方法调用**：JVM开始执行main方法，这部分工作是由虚拟机中字节码执行引擎完成的。main方法会由一个线程进行调用。此线程会在虚拟机栈上为自己开辟一部分的栈空间，此后只要这个线程调用新的方法，这个方法便会被当作**栈帧**压入虚拟机栈的栈顶（**作为当前栈帧**）。这个方法中定义的局部变量会被存储进局部变量表，在JVM中，并不存储局部变量的名称，他们都是以局部变量表的**相对偏移量**来标识每个不同的局部变量。

我以main方法的Code属性再说明一下栈帧中的局部变量表以及操作数栈。（Class文件中方法表的Code属性保存的是Java方法体中的字节码）

```java
Code:
      stack=3, locals=4, args_size=1
```

可以看到，main方法在调用之前（实际上在编译阶段，它的局部变量表，操作数栈的大小都已确定），locals为4，也就是局部变量表的大小为4：this，className，scanner，company；stack为3，也就是操作数栈的大小3：className，scanner，company。

我们还可以在上面方法体的字节码当中看到许多指令，而这些指令就是方法在执行的过程中，JVM需要解释运行的，如下：

```java
0: new           #2                  // class java/util/Scanner
```

前面的0表示的也是相对偏移量，而new指令就是新建一个对象，对应Java源码中的new，后面的#2代表的是new指令的参数，表达的意思是常量池中索引为2的数据项，也就是上述代码后面注释中的Scanner类。

值得一说的是，这里的Scanner由于是对类的实例化，因此JVM会首先判断Scanner这个类是否会被加载进内存，如果没有被加载进内存，JVM开始对这个类进行类加载，过程如上述步骤，然后进行对象的初始化。

指令一条条的向下面执行（**程序计数器**），进入循环体，最终执行到这一步：`Company company = new Company(className);`，也是一个对类的实例化，但它和上面的Scanner又有点不同，这个类不仅实现了ClassName接口，而且实例化的时候还进行了传参。那么何时会加载ClassName接口呢，博主根据查阅的资料，**猜测**是在Company类加载中的验证阶段会触发其接口的加载，具体大家可以Google、baidu。

那么如何实现参数的传递呢，相信大家应该是有印象的，它是在实例化Company类的过程中，执行了Company的构造方法，而构造方法本身又是一个方法，因此可以理解为实参先进入被调用方法的操作数栈中，然后将操作数栈中的引用出栈赋值给被调用方法的局部变量表。

最后，代码执行完毕，程序退出。


----------
## **参考阅读**

[JVM 内部原理（六）— Java 字节码基础之一](http://www.cnblogs.com/richaaaard/p/6214929.html)