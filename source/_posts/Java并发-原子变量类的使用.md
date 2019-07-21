---
title: Java并发--原子变量类的使用
date: 2018-10-03 13:51:16
tags:
    - 并发
    - 原子变量类
categories: Java并发
---

**注**：本篇博客主要内容来源于网络，侵删~

## **引言**

我们假设你已经熟练掌握了CAS，原子变量类等的相关概念。这篇博客中，我们主要讨论原子变量类的使用。


----------
## **原子变量类**

原子变量类共12个，分4组：

1. 计数器：`AtomicInteger`，`AtomicLong`，`AtomicBoolean`，`AtomicReference`。
2. 域更新器：`AtomicIntegerFieldUpdater`，`AtomicLongFieldUpdater`，`AtomicReferenceFieldUpdater`。
3. 数组：`AtomicIntegerArray`，`AtomicLongArray`，`AtomicReferenceArray`。
4. 复合变量：`AtomicMarkableReference`，`AtomicStampedReference`。

在每组中我会选择其中一个较有代表性的进行分析与举例。

### **AtomicReference**
#### **使用说明**

AtomicReference的作用是对"对象"进行原子操作。

#### **源码分析**

```java
public class AtomicReference<V> implements java.io.Serializable {
    private static final long serialVersionUID = -1848883965231344442L;
 
    // 获取Unsafe对象，Unsafe的作用是提供CAS操作
    private static final Unsafe unsafe = Unsafe.getUnsafe();
    private static final long valueOffset;
 
    static {
        try {
            // 获取相应字段相对Java对象的“起始地址”的偏移量
            valueOffset = unsafe.objectFieldOffset
                (AtomicReference.class.getDeclaredField("value"));
        } catch (Exception ex) { throw new Error(ex); }
    }
 
    // volatile类型
    private volatile V value;
 
    public AtomicReference(V initialValue) {
        value = initialValue;
    }
 
    public AtomicReference() {
    }
 
    public final V get() {
        return value;
    }
 
    public final void set(V newValue) {
        value = newValue;
    }
 
    public final void lazySet(V newValue) {
        unsafe.putOrderedObject(this, valueOffset, newValue);
    }
 
    public final boolean compareAndSet(V expect, V update) {
        return unsafe.compareAndSwapObject(this, valueOffset, expect, update);
    }
 
    public final boolean weakCompareAndSet(V expect, V update) {
        return unsafe.compareAndSwapObject(this, valueOffset, expect, update);
    }
 
    public final V getAndSet(V newValue) {
        while (true) {
            V x = get();
            if (compareAndSet(x, newValue))
                return x;
        }
    }
 
    public String toString() {
        return String.valueOf(get());
    }
}
```

关于上述代码只有两点需要强调：

1. `valueOffset = unsafe.objectFieldOffset(AtomicReference.class.getDeclaredField("value"))` 通过相关字段的偏移量获取值比直接使用反射获取相应字段的值性能要好许多；
2. 关于lazySet，推荐阅读这一篇博客：[JUC中Atomic Class之lazySet的一点疑惑][1]。

#### **使用举例**

```java
class Person {
    volatile long id;
    
    public Person(long id) {
        this.id = id;
    }
    
    public String toString() {
        return "id:" + id;
    }
}

public class AtomicReferenceTest {
    public static void main(String[] args) {
        // 创建两个Person对象，它们的id分别是101和102。
        Person p1 = new Person(101);
        Person p2 = new Person(102);
        // 新建AtomicReference对象，初始化它的值为p1对象
        AtomicReference ar = new AtomicReference(p1);
        
        // 通过CAS设置ar。如果ar的值为p1的话，则将其设置为p2。
        ar.compareAndSet(p1, p2);
 
        Person p3 = (Person)ar.get();
        System.out.println("p3 is "+p3);
        System.out.println("p3.equals(p1)="+p3.equals(p1));
    }
}
```

### **AtomicReferenceFieldUpdater**

接下来所有的原子变量类不再进行源码分析。事实上所有原子变量类的实现都大同小异，感兴趣的同学可以阅读源码。

#### **使用说明**

一个基于反射的工具类，它能对指定类的指定的volatile引用字段进行原子更新。(注意这个字段不能是private的) 

通过调用AtomicReferenceFieldUpdater的静态方法newUpdater就能创建它的实例，该方法要接收三个参数： 

1. 包含该字段的对象的类;
2. 将被更新的对象的类;
3. 将被更新的字段的名称。

#### **使用举例**

```java
class Dog {  
    volatile String name = "dog1";
}  

public class App {
    public static void main(String[] args) throws Exception {
        AtomicReferenceFieldUpdater updater = AtomicReferenceFieldUpdater.newUpdater(Dog.class, String.class, "name");
        Dog dog1 = new Dog();
        updater.compareAndSet(dog1, dog1.name, "test");
        
        System.out.println(dog1.name);
    }
}
```

### **AtomicReferenceArray**
#### **使用说明**

可以用原子方式更新其元素的对象引用数组。

以下是AtomicReferenceArray类中可用的重要方法的列表：

序列 | 方法 | 描述
---|---|---
1 | public AtomicReferenceArray(int length) | 构造函数，创建给定长度的新 AtomicReferenceArray。
2 | public AtomicReferenceArray(E[] array) | 构造函数，创建与给定数组具有相同长度的新 AtomicReferenceArray，并从给定数组复制其所有元素。
3 | public boolean compareAndSet(int i, E expect, E update) | 如果当前值==期望值，则将位置i处的元素原子设置为给定的更新值。
4 | public E get(int i) | 获取位置i的当前值。
5 | public E getAndSet(int i, E newValue) | 将位置i处的元素原子设置为给定值，并返回旧值。
6 | public void set(int i, E newValue) | 将位置i处的元素设置为给定值。

#### **使用举例**

```java
public class TestThread {
    // 创建原子引用数组
    private static String[] source = new String[10];
    private static AtomicReferenceArray<String> atomicReferenceArray = new AtomicReferenceArray<String>(source);

    public static void main(String[] args) throws InterruptedException {
        for (int i = 0; i < atomicReferenceArray.length(); i++) {
            atomicReferenceArray.set(i, "item-2");
        }

        Thread t1 = new Thread(new Increment());
        Thread t2 = new Thread(new Compare());
        t1.start();
        t2.start();

        t1.join();
        t2.join();        
    }
    
    static class Increment implements Runnable {
        public void run() {
            for(int i = 0; i < atomicReferenceArray.length(); i++) {
                String add = atomicReferenceArray.getAndSet(i, "item-" + (i+1));
                System.out.println("Thread " + Thread.currentThread().getId() 
                    + ", index " + i + ", value: " + add);
            }
        }
    }
    
    static class Compare implements Runnable {
        public void run() {
            for(int i = 0; i< atomicReferenceArray.length(); i++) {
                System.out.println("Thread " + Thread.currentThread().getId() 
                    + ", index " + i + ", value: " + atomicReferenceArray.get(i));
                boolean swapped = atomicReferenceArray.compareAndSet(i, "item-2", "updated-item-2");
                System.out.println("Item swapped: " + swapped);
                if(swapped) {
                    System.out.println("Thread " + Thread.currentThread().getId() 
                        + ", index " + i + ", updated-item-2");
                }
            }
        }
    }
}
```

### **AtomicStampedReference**
#### **使用说明**

AtomicStampedReference主要用来解决在使用CAS算法的过程中，可能会产生的**ABA问题**。一般我们会使用带有版本戳version的记录或对象标记来解决ABA问题，AtomicStampedReference<E>实现了这个作用，它通过包装[E, Integer]的元组来对对象标记版本戳stamp。

以下是AtomicStampedReference类中可用的重要方法的列表：

序列 | 方法 | 描述
---|---|---
1 | public AtomicStampedReference(V initialRef, int initialStamp) | 构造方法，传入引用和戳。
2 | public boolean compareAndSet(V expectedReference, V newReference, int expectedStamp, int newStamp)  | 如果当前引用 == 预期值并且当前版本戳 == 预期版本戳，将更新新的引用和新的版本戳到内存。
3 | public void set(V newReference, int newStamp) | 设置当前引用的新引用和版本戳。
4 | public boolean attemptStamp(V expectedReference, int newStamp) | 如果当前引用 == 预期引用，将更新新的版本戳到内存。

#### **使用举例**

下面的代码分别用AtomicInteger和AtomicStampedReference来对初始值为100的原子整型变量进行更新，AtomicInteger会成功执行CAS操作，而加上版本戳的AtomicStampedReference对于ABA问题会执行CAS失败：

```java
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicStampedReference;

public class ABA {
    private static AtomicInteger atomicInt = new AtomicInteger(100);
    private static AtomicStampedReference atomicStampedRef = new AtomicStampedReference(100, 0);

    public static void main(String[] args) throws InterruptedException {
        Thread intT1 = new Thread(new Runnable() {
            @Override
            public void run() {
                atomicInt.compareAndSet(100, 101);
                atomicInt.compareAndSet(101, 100);
            }
        });

        Thread intT2 = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    TimeUnit.SECONDS.sleep(1);
                } catch (InterruptedException e) {
                }
                boolean c3 = atomicInt.compareAndSet(100, 101);
                System.out.println(c3);         // true
            }
        });

        intT1.start();
        intT2.start();
        intT1.join();
        intT2.join();

        Thread refT1 = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    TimeUnit.SECONDS.sleep(1);
                } catch (InterruptedException e) {
                }
                atomicStampedRef.compareAndSet(100, 101, atomicStampedRef.getStamp(), atomicStampedRef.getStamp() + 1);
                atomicStampedRef.compareAndSet(101, 100, atomicStampedRef.getStamp(), atomicStampedRef.getStamp() + 1);
            }
        });

        Thread refT2 = new Thread(new Runnable() {
            @Override
            public void run() {
                int stamp = atomicStampedRef.getStamp();
                try {
                    TimeUnit.SECONDS.sleep(2);
                } catch (InterruptedException e) {
                }
                boolean c3 = atomicStampedRef.compareAndSet(100, 101, stamp, stamp + 1);
                System.out.println(c3);         // false
            }
        });

        refT1.start();
        refT2.start();
    }
}
```


----------
## **性能比较：锁与原子变量**

事实上，CAS的性能总是优于锁。我们分两种情况进行讨论。

**1. 线程间竞争程度较高**

对于锁来说，激烈的竞争意味着线程频繁的挂起与恢复，频繁的上下文切换，这些操作都是非常耗费系统资源的；对于CAS算法来说，激烈的竞争意味着线程将对竞争进行频繁的处理（重试，回退，放弃等策略）。

即使如此，一般来说，CAS算法的性能依旧优于锁。

**2. 线程间竞争程度较低**

较低的竞争程度意味着CAS操作总是能够成功；对于锁来说，虽然锁之间的竞争度也随之下降，但由于获取锁与释放锁的操作不但耗费系统资源，并且其中本身就包含着CAS操作，因此在这种情况下，CAS操作的性能依旧优于锁。


----------
## **总结**

1. 这篇博客并没有讲述CAS操作以及可能产生的ABA问题，但是我们必须熟悉这两个知识点；
2. 这篇博客的主要目的是构建起大家对原子变量类的一个认识，以至于在以后的项目开发中，可以去思考如何使用这些原子变量类；
3. 对于原子变量与锁之间的优势与劣势，性能间的比较，有一个较为清晰的认识。


----------
## **参考阅读**

Java并发编程实战

[Java并发AtomicReferenceArray类][2]

[用AtomicStampedReference解决ABA问题][3]


  [1]: http://ifeve.com/juc-atomic-class-lazyset-que/
  [2]: https://www.yiibai.com/java_concurrency/concurrency_atomicreferencearray.html
  [3]: https://www.cnblogs.com/java20130722/p/3206742.html