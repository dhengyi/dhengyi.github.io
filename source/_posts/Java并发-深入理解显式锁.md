---
title: Java并发--深入理解显式锁
date: 2018-09-27 15:46:50
tags: 
    - 并发
    - 显式锁
categories: Java并发
---

**注**：本篇博客部分内容引用自：[Java并发编程：Lock][1]

## **引言**

在Java 5.0之前，协调对共享对象的访问可以使用到的机制只有synchronized和volatile。在Java 5.0之后，增加了一种新的机制：ReentrantLock。ReentrantLock并不是一种替代内置锁的方法，而是在内置锁不再适用的情况下，作为一种可选择的高级功能。


----------
## **既生synchronized，何生Lock**

synchronized主要在功能上存在一些局限性。

如果获取锁的线程由于要等待IO或者其他原因（比如调用sleep方法）被阻塞了，但是又没有释放锁，其他线程便只能干巴巴地等待，试想一下，这多么影响程序执行效率。因此就需要有一种机制可以不让等待的线程一直无期限地等待下去（比如只等待一定的时间或者能够响应中断），通过Lock就可以办到。

再举个例子：当有多个线程读写文件时，读操作和写操作会发生冲突现象，写操作和写操作会发生冲突现象，但是读操作和读操作不会发生冲突现象。

如果采用synchronized关键字来实现同步的话，就会导致一个问题：如果多个线程都只是进行读操作，那么当一个线程在进行读操作时，其他线程只能等待无法进行读操作。因此就需要一种机制来使得多个线程都只是进行读操作时，线程之间不会发生冲突，通过Lock就可以办到。

另外，通过Lock可以知道线程有没有成功获取到锁。这个是synchronized无法办到的。

值得注意的是：**在使用Lock时，我们必须在finally块中释放锁！**

如果在被保护的代码块中抛出了异常，那么这个锁永远都无法被释放。如果没有使用finally来释放锁，当出现问题时，将很难追踪到最初发生错误的位置，因为我们没有记录应该释放锁的位置与时间。

**这就是ReentrantLock不能完全替代synchronized的原因：它更加危险，因为当程序的执行控制离开被保护的代码块时，不会自动清除锁。**

**注**：FindBugs可以帮助你找到未释放的锁。


## **Lock接口**
### **认识Lock**

我们先来看一下Lock接口的实现：

```java
public interface Lock {
    // 加锁
    void lock();
    // 可中断的锁
    void lockInterruptibly() throws InterruptedException;
    // 轮询锁与定时锁
    boolean tryLock();
    boolean tryLock(long time, TimeUnit unit) throws InterruptedException;
    // 解锁
    void unlock();
    // 本节并不需要关注
    Condition newCondition();
}
```

**ReentrantLock是唯一实现了Lock接口的类**。在获取（释放）ReentrantLock时，有着与进入（退出）同步代码块相同的内存语义，与synchronized一样，ReentrantLock还提供了**可重入**的加锁语义。

### **tryLock方法**

tryLock只有在成功获取了锁的情况下才会返回true，如果别的线程当前正持有锁，则会立即返回false！如果为这个方法加上timeout参数，则会等待timeout的时间才会返回false或者在获取到锁的时候返回true。

在内置锁中，死锁是一个严重的问题，恢复程序的唯一方法是重启程序，而防止死锁的唯一方法就是在构造程序时避免出现不一致的锁顺序。可定时与可轮询的锁提供了另一种方式：避免死锁的发生。

如果不能获取所有需要的锁，那么可以使用可定时或可轮询的锁获取方式，从而使你重新获得控制权，它会释放已经获得的锁，然后重新尝试获取所有锁。无参数的tryLock一般用作轮询锁，而带有TimeUnit参数的一般用作定时锁。

考虑如下程序，它将资金从一个账户转入另一个账户。在开始转账之前，首先要获得这两个Account对象的锁，以确保通过原子方式来更新两个账户中的余额，同时又不破坏一些不变性条件，如：“账户的余额不能为负数”。

```java
public void transferMoney(Account fromAccount, Account toAccount, DollarAmount amount) 
        throws InsufficientResourcesException {
    synchronized (fromAccount) {
        synchronized (toAccount) {
            if (fromAccount.getBalance().compareTo(amount) < 0) {
                throw  new InsufficientResourcesException();
            } else {
                fromAccount.debit(amount);
                toAccount.credit(amount);
            }
        }
    }
}
```

这个程序看似无害，实则会发生死锁。如果两个线程同时调用transferMoney，其中一个线程从X向Y转账，另一个线程从Y向X转账，那么就会发生死锁：

```
A: transferMoney(myAccount, yourAccount, 10);
B: transferMoney(yourAccount, myAccount, 20);
```

如果执行顺序不当，那么A可能获得myAccount的锁并等待yourAccount的锁，然而B此时持有yourAccount的锁并等待myAccount的锁，就会发生死锁。

我们可以使用tryLock用作轮询锁来解决这样的问题，使用tryLock来获取两个锁，如果不能同时获得，则退回并重新尝试。程序中锁获取的休眠时间包括固定部分和随机部分，从而降低了发生[活锁][2]的可能性。如果在指定时间内不能获得所有需要的锁，那么transferMoney将返回一个失败状态，从而使该操作平缓的失败。

```java
public boolean transferMoney(Account fromAcct, Account toAcct, DollarAmount amount, long timeout,
    TimeUnit unit) throws InsufficientResourcesException, InterruptedException {
    long fixedDelay = getFixedDelayComponentNanos(timeout, unit);
    long randMod = getRandomDelayModulusNanos(timeout, unit);
    long stopTime = System.nanoTime() + unit.toNanos(timeout);
        
    while (true) {
        if (fromAcct.lock.tryLock()) {
            try {
                if (toAcct.lock.tryLock()) {
                    try {
                        if (fromAccount.getBalance().compareTo(amount) < 0) {
                            throw new InsufficientResourcesException();
                        } else {
                            fromAccount.debit(amount);
                            toAccount.credit(amount);
                            return true;
                        }
                    } finally {
                        toAcct.lock.unlock();
                    }
                }
            } finally {
                fromAcct.lock.unlock();
            }
        }
            
        if (System.nanoTime() < stopTime) {
            return false;
        }
        NANOSECONDS.sleep(fixedDelay + rnd.nextLong() % randMod);
    }
}
```

tryLock用作定时锁的程序如下：

```java
public boolean trySendOnSharedLine(String message, long timeout, TimeUnit unit) 
        throws InterruptedException {
    long nanosToLock = unit.toNanos(timeout) - estimatedNanosToSend(message);
    if (!lock.tryLock(nanosToLock, NANOSECONDS)) {
        return false;
    }
    
    try {
        return trySendOnSharedLine(message);
    } finally {
        lock.unlock();
    }
} 
```

上述程序试图在Lock保护的共享通信线路上发送一条消息，如果不能在指定的时间内完成，代码就会失败。定时的tryLock能够在这种带有时间限制的操作中实现独占加锁的行为。

### **lockInterruptibly方法**

lockInterruptibly方法比较特殊，当通过这个方法去获取锁时，如果线程正在等待获取锁，则这个线程能够响应中断，即中断线程的等待状态。也就使说，当两个线程同时通过lock.lockInterruptibly()想获取某个锁时，假若此时线程A获取到了锁，而线程B只有在等待，那么对线程B调用threadB.interrupt()方法能够中断线程B的等待过程。

由于在lockInterruptibly方法的声明中抛出了异常，所以lock.lockInterruptibly()必须放在try块中或者在调用lockInterruptibly的方法外声明抛出InterruptedException。

因此lockInterruptibly一般的使用形式如下：

```java
public void method() throws InterruptedException {
    lock.lockInterruptibly();
    try {  
     // .....
    } finally {
        lock.unlock();
    }  
}
```

注意，当一个线程获取了锁之后，是不会被interrupt方法中断的。因为单独调用interrupt方法不能中断正在运行过程中的线程，只能中断阻塞过程中的线程。因此当通过lockInterruptibly方法获取某个锁时，如果不能获取到，只有在进行等待的情况下，是可以响应中断的。

定时的tryLock同样能够响应中断，因此当需要实现一个定时的和可中断的锁获取操作时，可以使用tryLock方法。


----------
## **公平锁**

公平锁即尽量以请求锁的顺序来获取锁。比如同是有多个线程在等待一个锁，当这个锁被释放时，等待时间最久的线程（最先请求的线程）会获得该锁，这种就是公平锁。

非公平锁即无法保证锁的获取是按照请求锁的顺序进行的。这样就可能导致某个或者一些线程永远获取不到锁。

在Java中，synchronized就是非公平锁，它无法保证等待的线程获取锁的顺序。而对于ReentrantLock和ReentrantReadWriteLock，它默认情况下是非公平锁，但是可以设置为公平锁。

在ReentrantLock中定义了2个静态内部类，一个是NotFairSync，一个是FairSync，分别用来实现非公平锁和公平锁。我们可以在创建ReentrantLock对象时，通过以下方式来设置锁的公平性：

    ReentrantLock lock = new ReentrantLock(true);
    
参数为true表示为公平锁，为fasle为非公平锁。默认情况下，如果使用无参构造器，则是非公平锁。

另外在ReentrantLock类中定义了很多方法，比如：

```java
isFair()            //判断锁是否是公平锁

isLocked()          //判断锁是否被任何线程获取了

isHeldByCurrentThread()     //判断锁是否被当前线程获取了

hasQueuedThreads()          //判断是否有线程在等待该锁
```

在ReentrantReadWriteLock中也有类似的方法，同样也可以设置为公平锁和非公平锁。不过要记住，ReentrantReadWriteLock并未实现Lock接口，它实现的是ReadWriteLock接口。


----------
## **在synchronized与ReentrantLock之间进行抉择**

在性能上，Java 5.0中ReentrantLock远远优于内置锁，而在Java 6.0中则是略有胜出。

我们建议，仅当内置锁不能满足需求时，才可以考虑使用ReentrantLock。

在Java 8.0中，内置锁的性能已经不压于ReentrantLock，并且未来更可能会继续提升synchronized的性能，毕竟synchronized是JVM的内置属性。


----------
## **总结**

1. 清楚为什么有Lock接口；
2. 清楚使用ReentrantLock有什么优缺点；
3. 掌握如何使用ReentrantLock（定时锁，轮询锁，中断锁以及一些其他功能）；
4. 能够在synchronized与Lock中做出选择。


----------
## **参考阅读**

Java并发编程实战

[Java并发编程：Lock][1]


  [1]: http://www.cnblogs.com/dolphin0520/p/3923167.html
  [2]: https://baike.baidu.com/item/%E6%B4%BB%E9%94%81/5096375