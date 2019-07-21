---
title: Java并发--深入理解线程池
date: 2018-09-13 21:38:05
tags:
    - 并发
    - 线程池
categories: Java并发
---

## **为什么需要线程池**

在生产环境中，我们不能无限制的创建线程，主要原因如下：

1. 线程创建与销毁的代价并不低；
2. 如果可运行的线程数量多于可用处理器的数量，有些线程将会闲置，大量闲置的线程会消耗系统资源（内存）并给垃圾收集器带来压力；
3. 大量线程竞争CPU也会造成不小的性能开销。


----------
## **Executor框架**

Executor框架在Java 5中被引入，其内部使用了线程池机制。它在java.util.cocurrent包下，通过该框架来控制线程的启动、执行和关闭，可以简化并发编程的操作。

Executor框架包括：线程池，Executor，Executors，ExecutorService等（Callable与Future本篇不进行讨论）。

### **Executor接口**

我们先来了解一下其中的Executor接口：

```java
public interface Executor {
    void execute(Runnable command);
}
```

Executor接口的定义非常简单，但它却为灵活且强大的异步任务执行框架提供了能够支持多种不同类型任务的执行策略。它提供一种标准的方法将任务的提交过程与执行过程进行了解耦。

Executor接口基于生产者 — 消费者模型，提交任务的操作相当与生产者，执行任务的线程相当于消费者。

线程池的实现操作了Executor接口，但现在，我们只关心它是如何将任务提交与任务执行进行解耦的。来看一个例子：

```java
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * @author dhengyi
 * @since 2018/9/4 23:29
 **/
public class TaskExecutionWebServer {
    private static final int NTHREADS = 100;
    private static final Executor executor = Executors.newFixedThreadPool(NTHREADS);

    public static void main(String[] args) throws IOException {
        ServerSocket serverSocket = new ServerSocket(80);
        while (true) {
            final Socket connection = serverSocket.accept();
            // 任务创建
            Runnable task = new Runnable() {
                @Override
                public void run() {

                }
            };

            // 任务提交与执行
            executor.execute(task);
        }
    }
}
```

对上述代码进行修改，将任务的执行改为为每个任务都创建新的线程：

```java
import java.util.concurrent.Executor;

/**
 * @author dhengyi
 * @since 2018/9/5 9:37
 **/
public class ThreadPerTaskExecutor implements Executor {
    @Override
    public void execute(Runnable command) {
        new Thread(command).start();
    }
}
```

我们还可以对其进行修改，使TaskExecutionWebServer的行为类似于单线程的行为，即以同步的方式执行每个任务：

```java
import java.util.concurrent.Executor;

/**
 * @author dhengyi
 * @since 2018/9/5 9:43
 **/
public class WithinThreadExecutor implements Executor {
    @Override
    public void execute(Runnable command) {
        command.run();
    }
}
```

通过使用Executor，我们将任务的提交与执行进行了解耦，我们只需采用另一种不同的Executor实现，就完全可以改变应用程序的行为。改变Executor实现或配置所带来的影响要远远小于改变任务提交方式带来的影响。

### **Executor的生命周期—ExecutorService接口**

我们已经知道了如何创建一个Executor，但JVM只有在所有非守护线程全部终止后才会退出，因此我们还需讨论一下Executor如何关闭。

关闭应用程序的方式我们通常分为两种：

1. 平缓的关闭：完成所有已启动的任务，拒绝接受新任务。
2. 粗暴的关闭：直接取消所有任务，拒绝接受新任务。

为了便于管理执行服务的生命周期，Executor扩展了ExecutorService接口，如下：

```java
public interface ExecutorService extends Executor {
    // 平缓的关闭
    void shutdown();
    // 粗暴的关闭
    List<Runnable> shutdownNow();
    boolean isShutdown();
    boolean isTerminated();
    // 等待终止，通常在调用此方法后会立即调用shutdown，从而产生同步关闭ExecutorService的效果
    boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException;
    
    // ... ... 其他用于任务提交的便利方法
}
```

ExecutorService的生命周期有三种状态：运行，关闭，终止。

创建ExecutorService时处于运行态（RUNNING）。我们可以通过调用线程池的shutdown或shutdownNow方法来关闭线程池，在调用这两个方法之一后，线程池将不再接收新任务。它们的原理是遍历线程池中的工作线程，然后逐个调用线程的interrupt方法来中断线程，所以无法响应中断的任务可能永远无法终止。但是它们存在一定的区别，shutdownNow首先将线程池的状态设置成STOP，然后尝试停止所有的正在执行或暂停任务的线程，并返回等待执行任务的列表，而shutdown只是将线程池的状态设置成SHUTDOWN状态，然后中断所有没有正在执行任务的线程。

只要调用了这两个关闭方法的其中一个，isShutdown方法就会返回true。当所有的任务都已关闭，且任务缓存队列已经清空或执行结束后才表示线程池关闭成功，进入终止态（TERMINATED），这时调用isTerminaed方法会返回true。

### **线程池的创建—Executors**

关于线程池的优势不再多说。我们可以通过Executors中的静态工厂方法创建一个线程池：

1. **newFixedThreadPool**：创建固定大小的线程池，每当提交一个任务就创建一个线程，直到达到线程池最大数量，如果某个线程发生了Exception异常，线程池会补充一个新线程；
2. **newCachedThreadPool**：可缓存线程池，如果线程池中有空闲的线程，那么将会回收空闲线程，当任务数量增加时，则添加新的线程，线程池的规模不受限制；
3. **newSingleThreadExecutor**：单线程Executor，如果此线程出现异常，会创建另一个线程进行替代。它会确保依照任务在队列中的顺序来串行执行；
4. **newScheduledThreadPool**：创建固定大小线程池并以延迟或定时的方式来执行任务。


----------
## **线程池的使用**
### **认识ThreadPoolExecutor**

如果Executors提供默认的静态工厂方法创建的线程池不能满足需求，我们可以通过ThreadPoolExecutor的构造函数实例化一个对象，根据自己的需求定制相应线程池，ThreadPoolExecutor定义了许多构造函数，我们给出最常见的形式：

```java
public ThreadPoolExecutor(int corePoolSize,
                              int maximumPoolSize,
                              long keepAliveTime,
                              TimeUnit unit,
                              BlockingQueue<Runnable> workQueue,
                              ThreadFactory threadFactory,
                              RejectedExecutionHandler handler) {
    ... ...
}
```

其实通过源码我们可以知道：ThreadPoolExecutor继承了类AbstractExecutorService，抽象类AbstractExecutorService实现了ExecutorService接口，基本实现了ExecutorService中声明的所有方法，ExecutorService接口继承了Executor接口，因此ThreadPoolExecutor也基于Executor接口。

我们分模块对上述参数进行描述。

### **线程的创建与销毁**

corePoolSize（基本大小），maximumPoolSize（最大大小），keepAliveTime（存活时间）等因素共同负责线程的创建与销毁。

**基本大小**：当提交一个任务到线程池时，线程池会创建一个线程来执行任务，即使其他空闲的基本线程能够执行新任务也会创建线程，如果调用了线程池的prestartAllCoreThreads方法，线程池会提前创建并启动所有基本线程。只有在工作队列满时才会创建超出这个数量的线程；
**最大大小**：线程池中可同时活动的线程数量的上限。若某个线程的空闲时间超过存活时间，则此线程被标记为可回收，并当线程池当前大小超过基本大小时，此线程将被终止。

newFixedThreadPool工厂方法将线程池的基本大小与最大大小设置为参数中指定的值并且两者相等，且创建的线程池不会超时；newCachedThreadPool工厂方法将线程池的最大大小设为Integer.MAX_VALUE，而将基本大小设置为0，超时设置为1分钟。其他形式的线程池可以通过显式的ThreadPoolExecutor构造函数进行构造。

**注**：在将基本大小设置为0之后，有一些值得注意的事项。只有当线程池中的线程数量等于线程池的基本大小并且工作队列已满的情况下，ThreadPoolExecutor才会创建新的线程。因此，如果线程池的基本大小为0，但工作队列还有容量，那么把任务交给线程池时，只有当线程池的工作队列被填满之后，才会执行任务。这通常不是我们所期望的。（将基本大小设置为0的主要目的为当没有任务执行时，销毁工作线程以免阻碍JVM的退出）

### **任务队列**

当任务到达线程池的速率超过了线程池的处理速率，那么新到来的任务将会累积起来，我们在线程池中使用一个由Executor管理的Runnable队列来保存等待执行的任务。使用任务队列的好处在于降低了这些任务对CPU资源的竞争，任务队列可以缓解任务的突增问题，但如果任务持续高速的到来，依旧可能耗尽内存资源（阻塞队列没有边界）。

任务队列分为三种：有界队列，无界队列，同步移交。

newFixedThreadPool和newSingleThreadExecutor在默认情况下都使用无界队列：LinkedBlockingQueue。

我们建议使用有界队列，例如：ArrayBlockingQueue，有界的LinkedBlockingQueue，PriorityBlockingQueue。有界队列有助于避免资源的耗尽。

在newCachedThreadPool中则使用了SynchronousQueue（Java 5，在Java 6中提供了一个新的非阻塞算法来替代了SynchronousQueue）。SynchronousQueue并不是一个真正的队列，而是一种在线程之间进行移交的机制。要将一个元素放入SynchronousQueue中，必须要有另一个线程正在等待接收这个元素。如果没有线程正在等待，并且线程池的当前大小小于最大值，则ThreadPoolExecutor将创建一个新的线程，否则将拒绝这个任务。只有当线程池是无界的或是可以拒绝任务时，SynchronousQueue才具有实际价值。使用这种方式的优势很明显：任务会直接移交给执行它的线程，而不是被首先放在队列中。

对于Executor，newCachedThreadPool是一种很好的默认选择。

只有任务独立，为线程池或工作队列设置界限才是合理的。如果任务之间存在依赖性，那么有界的线程池或工作队列则可能导致线程出现“饥饿”死锁问题，此时应使用无界线程池如：newCachedThreadPool。

### **线程工厂**

线程池中的线程都是由线程工厂进行创建的。默认的线程工厂创建一个新的，非守护的线程。我们可以通过指定一个线程工厂方法，来定制线程池的配置信息。ThreadFactory接口如下：

```java
public interface ThreadFactory {
    Thread newThread(Runnable r);
}
```

每当线程池中创建一个新线程，都会调用这个newThread方法。

通常，我们都会使用定制的线程工厂方法，我们可能希望实例化一个定制的Thread类用于执行调试信息的记录，可能希望修改线程优先级，或者只是为了给线程取一个更有意义的名字。在如下程序中，我们给出一个自定义的线程工厂：

```java
import java.util.concurrent.ThreadFactory;

/**
 * @author dhengyi
 * @since 2018/9/12 22:48
 **/
public class MyThreadFactory implements ThreadFactory {
    private final String poolName;

    public MyThreadFactory(String poolName) {
        this.poolName = poolName;
    }

    @Override
    public Thread newThread(Runnable r) {
        return new MyAppThread(r, poolName);
    }
}
```

我们还可以在MyAppThread中定制其他行为，包括为线程指定名字，设置自定义的UncaughtExceptionHandler向Logger中写入信息，维护一些统计信息（多少个线程被创建与销毁），在线程被创建或终止时把调试信息写入日志。

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * @author dhengyi
 * @since 2018/9/12 21:51
 **/
public class MyAppThread extends Thread {
    public static final String DEFAULT_NAME = "MyAppThread";
    private static volatile boolean debugLifecycle = false;
    private static final AtomicInteger created = new AtomicInteger();
    private static final AtomicInteger alive = new AtomicInteger();
    private static final Logger log = Logger.getAnonymousLogger();

    public MyAppThread(Runnable runnable) {
        this(runnable, DEFAULT_NAME);
    }

    public MyAppThread(Runnable runnable, String name) {
        super(runnable, name + "-" + created.incrementAndGet());
        setUncaughtExceptionHandler(
                new Thread.UncaughtExceptionHandler() {
                    public void uncaughtException(Thread t, Throwable e) {
                        log.log(Level.SEVERE, "UNCAUGHT in thread" + t.getName(), e);
                    }
                });
    }

    @Override
    public void run() {
        boolean debug = debugLifecycle;
        if (debug) log.log(Level.FINE, "Created " + getName());
        try {
            alive.incrementAndGet();
            super.run();
        } finally {
            alive.decrementAndGet();
            if (debug) log.log(Level.FINE, "Exiting " + getName());
        }
    }

    public static int getThreadsCreated() { 
        return created.get();
    }

    public static int getThreadsAlive() {
        return alive.get();
    }

    public static boolean getBug() {
        return debugLifecycle;
    }
    
    public static void setDebug(boolean b) {
        debugLifecycle = b;
    }
}
```

### **饱和策略**

当有界队列被填满之后，饱和策略开始发挥作用。我们可以通过ThreadPoolExecutor的setRejectedExecutionHandler方法来选择不同的饱和策略。JDK主要提供了以下几种不同的饱和策略：

1. AbortPolicy（中止策略）：默认的饱和策略，会抛出未检查的RejectedExecutionException。我们可以捕获这个异常，并按需编写自己的处理代码。
2. DiscardPolicy（抛弃策略）：当任务队列已满，抛弃策略会抛弃该任务。
3. DiscardOldestPolicy（抛弃最旧策略）：会抛弃下一个将要执行的任务（入队最早的任务，可以理解为最旧的任务），然后尝试重新提交新任务。
4. CallerRunsPolicy（调用者运行策略）：该策略不会抛弃任务，也不会抛出异常，而是将某些任务回退到调用者。它不会在线程池中的某个线程中执行任务，而是在调用了execute的线程中执行该任务。因此当工作队列已满，并且线程池中线程数量已达maximumPoolSize时，下一个任务会在调用execute的主线程中执行。由于任务执行需要一定的时间，因此主线程在这段时间内不会调用accept，因此到达的请求将被保存在TCP层的队列中而不是应用程序的队列中。如果持续过载，那么TCP层的缓冲队列也将会被填满，因此同样会抛弃请求。但对于服务器来说，这种过载情况是逐渐向外蔓延开的 — 从线程池队列到应用程序再到TCP层，最终到达客户端，这是一种平缓的性能降低。

如下，我们使用了“调用者运行”饱和策略：

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(N_THREADS, N_THREADS, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<Runnable>(CAPACITY));

executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
```


----------
## **总结**

**1. 熟悉Executor框架；**

注：所有的线程池都基于Executor接口，ExecutorService接口继承于Executor，提供了对线程池生命周期的管理，Executors提供了默认的几种创建线程池的工厂方法。

**2. 熟练掌握ThreadPoolExecutor的使用，熟悉ThreadPoolExecutor中各个参数使用及含义；**

注：当默认提供的线程池不能满足自己的需求，我们就需要通过ThreadPoolExecutor定制线程池。

**3. 线程池还有诸多细节；**

注：如何合理配置线程池的大小，继承ThreadPoolExecutor对其进行扩展（beforeExecutor，afterExecutor，terminated）


----------
## **参考阅读**

Java并发编程实战

[聊聊并发 — Java线程池的分析和使用][1]

[Java并发编程：线程池的使用][2] — 很详细的一篇博客，其中还讨论了线程池的实现细节


  [1]: http://www.infoq.com/cn/articles/java-threadPool
  [2]: https://www.cnblogs.com/dolphin0520/p/3932921.html