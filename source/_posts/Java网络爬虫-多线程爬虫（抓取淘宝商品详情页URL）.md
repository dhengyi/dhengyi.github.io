---
title: Java网络爬虫--多线程爬虫（抓取淘宝商品详情页URL）
date: 2018-03-02 22:35:30
tags: 
    - 爬虫
    - 项目
categories: Java网络爬虫
---

**源码地址：[多线程爬虫--抓取淘宝商品详情页URL](h   ttps://github.com/championheng/multithreading-crawlers)**

项目地址中包含了一份README，因此对于项目的介绍省去部分内容。这篇博客，主要讲述项目的构建思路以及实现细节。


----------
## **项目概述及成果**

首先将本项目使用到技术罗列出来：

> 1. MySQL数据库进行数据持久化及对宕机情况的发生做简单的处理
> 2. Redis数据库做IP代理池及部分已抓取任务的缓存
> 3. 自制IP代理池
> 4. 使用多线程执行任务（同步块，读写锁，等待与通知机制，线程优先级）
> 5. HttpClient与Jsoup的使用
> 6. 序列化与反序列化
> 7. 布隆过滤器

之后会对其中使用到的技术进行详细的解释。

本项目如README中所述，还有许多不完善的地方，但IP代理池与任务抓取线程之间的调度与协作基本已无问题。也就是说，在此项目的框架上，如果你想修改其中代码用作其他抓取任务，也是完全可以的。我抓取到的数据所保存的源文件也放在GitHub的README上供大家免费浏览与下载（近90000的商品ID）。


----------
## **整体思路**

> 1. 首先你需要一个IP代理池
> 2. 使用本机IP将淘宝中基本的商品分类抓取下来
> - 页面源链接：`https://www.taobao.com/tbhome/page/market-list`
> - 从页面源链接中解析到的URL形如下：`https://s.taobao.com/search?q=羽绒服&style=grid`
> 3. 将诸如此类的URL`https://s.taobao.com/search?q=羽绒服&style=grid`作为任务队列，使用多线程对其进行抓取与解析（使用代理IP）,解析的内容为第4点
> 4. 我们需要分析每一种类的商品在淘宝中大概具有多少数量，为此我解析出带有页面参数的URL，在第3点中URL的基础上：`https://s.taobao.com/search?q=羽绒服&style=grid&s=44`，在浏览器中打开URL可发现此页面为此种类衣服的第二页
> 5. 我们得到了每一种商品带有页面参数的URL，意味着我们可以得到此类商品中全部或部分的商品ID，有了商品ID，我们就可以进入商品详情页抓取我们想要的数据了
> 6. 为了实现第5点，我们先将第4点中抓取到的URL全部存储进MySQL中
> 7. 从MySQL中将待抓取URL全部取出，存储到一个队列中，使用多线程对此共享队列进行操作，使用代理IP从待解析URL中解析出本页面中包含的商品ID，并构建商品详情页URL
> 8. 在第7点中解析商品ID的时候，同时使用布隆过滤器，对重复ID进行过滤，并将已经抓取过的URL任务放入Redis缓存中，等达到合适的阈值时，将存储在MySQL中对应的URL行记录中的flag置为true，表示此URL已经被抓取过，等到下一次重启系统，可以不用对此URL进行抓取


----------
## **实现细节（省略大量实现代码，如有需要请阅读源码）**
### **IP代理池**

我们先从IP代理池说起，在这个项目中所运用到的IP代理池与我在[Java网络爬虫（十一）--重构定时爬取以及IP代理池（多线程+Redis+代码优化）](http://blog.csdn.net/championhengyi/article/details/77053448)这一篇博客中所讲述的IP代理池的实现思想有一些细小的差别。

- **差别1：不再使用定时更新IP代理池的方法**

>由于是将IP代理池真正的运用到一个工程中，因此定时更新IP代理池的方法已经不可取。我们的IP代理池作为一个生产者，众多线程都要使用其中的代理IP，我们就可以认为这些线程都为消费者，根据多线程中经典的**生产者与消费者模型**，在没有足够的产品供消费者使用的时候，生产者就应该开始进行生产。也就是说，IP代理池的更新变为，当池中已经没有足够的代理IP供众多线程使用的时候，IP代理池就应该开始进行更新。而在IP代理池进行更新的时候，众多线程作为消费者，也只能等待。

具体的代码实现如下：

```java
// 创建生产者（ip-proxy-pool）与消费者（thread-tagBasicPageURL-i）等待/通知机制所需的对象锁
Object lock = new Object();
```

**生产者---IP代理池**：
```java
/**
 * Created by hg_yi on 17-8-11.
 *
 * @Description: IP代理池的整体构建逻辑
 */
public class MyTimeJob extends TimerTask {
    // IP代理池线程是生产者，此锁用来实现等待/通知机制，实现生产者与消费者模型
    private final Object lock;

    MyTimeJob(Object lock) {
        this.lock = lock;
    }

    @Override
    public void run() {
        ... ...

        // 如果IP代理池中没有IP信息，则IP代理池进行工作
        while (true) {
            while (myRedis.isEmpty()) {
                synchronized (lock) {
	                ... ...

                    lock.notifyAll();
                }
            }
        }
    }
}
```

**消费者---thread-tagBasicPageURL-i**：

```java
/**
 * @Author: spider_hgyi
 * @Date: Created in 下午1:01 18-2-1.
 * @Modified By:
 * @Description: 得到带有分页参数的主分类搜索页面的URL
 */
public class TagBasicPageCrawlerThread implements Runnable {
    private final Object lock;              // 有关生产者、消费者的锁
    ... ...

    public TagBasicPageCrawlerThread(Queue<String> tagBasicUrls, Object lock, Queue<String> tagBasicPageUrls,
                                     Object taskLock) {
        this.tagBasicUrls = tagBasicUrls;
        this.lock = lock;
        this.tagBasicPageUrls = tagBasicPageUrls;
        this.taskLock = taskLock;
    }

    @Override
    public void run() {
	    ... ...
	    
        // 此flag用于--->如果IP可以进行抓取，则一直使用此IP，不在IP代理池中重新拿取新IP的逻辑判断
        boolean flag = true;

        // 每个URL用单独的代理IP进行分析
        while (true) {
            if (flag) {
                synchronized (lock) {
                    while (myRedis.isEmpty()) {
                        try {
                            System.out.println("当前线程：" + Thread.currentThread().getName() + ", " +
                                    "发现ip-proxy-pool已空, 开始进行等待... ...");
                            lock.wait();
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }

                    ipMessage = myRedis.getIPByList();
                }
            }
            ... ...    
        }
    }
}
```

从上面的代码中，我们可以清楚的看到等待/通知机制的经典范式：

**等待方（伪代码）**：

```java
synchronized(对象) {
	while(条件不满足) {
	    对象.wait();
	}
	对应的逻辑处理
}
```

**通知方（伪代码）**：

```java
synchronized(对象) {
     改变条件
     对象.notifyAll();
}
```

关于等待/通知机制更详细的使用，参考这篇博客：[Java线程之间的通信(等待/通知机制)](http://blog.csdn.net/canot/article/details/50879963)

- **差别2：不再给每个线程分配固定数目的任务。将任务放在共享队列中，供线程使用**

> 在重构IP代理池的那一版本中，我将待抓取任务平分给了多个线程，每个线程将自己拿到的那些任务执行完毕即可。在将IP代理池运用到工程中的时候，我并没有那样做，而是维护了一个任务队列，每个线程都可以在这个任务队列中取任务，直到队列为空为止。这就改善了在多个线程平分任务的这种情况下，由于一个线程需要完成多个任务，而这多个任务间不是并发执行的缺点。

具体的代码实现如下（我们只需要注意其中的saveIP方法，方法参数urls就是共享任务队列）：

```java
/**
 * Created by hg_yi on 17-8-11.
 *
 * @Description: 抓取xici代理网的分配线程
 * 抓取不同页面的xici代理网的html源码，就使用不同的代理IP，在对IP进行过滤之后进行合并
 */
public class CreateIPProxyPool {
    ... ...

    public void saveIP(Queue<String> urls, Object taskLock) {
        ... ...

        while (true) {
            /**
             * 随机挑选代理IP(本步骤由于其他线程有可能在位置确定之后对ipMessages数量进行
             * 增加，虽说不会改变已经选择的ip代理的位置，但合情合理还是在对共享变量进行读写的时候要保证
             * 其原子性，否则极易发生脏读)
             */
            ... ...

            // 任务队列是共享变量，对其的读写必须进行正确的同步
            synchronized (taskLock) {
                if (urls.isEmpty()) {
                    System.out.println("当前线程：" + Thread.currentThread().getName() + ", 发现任务队列已空");
                    break;
                }
                url = urls.poll();
            }
            ... ...
        }
    }
}
```

### IP代理池在项目中是如何对抗反爬虫的

我在使用IP代理池对抗反爬虫的时候，对IP代理池还做了些许改变：修改了IPMessage类结构。看过我关于IP代理池项目博客的同学应该清楚IPMessage这个类是做什么的，就是用来存储有关代理IP信息的。类结构如下：

```java
/**
 * Created by hg_yi on 17-8-11.
 *
 * @Description: IPMessage JavaBean
 */
public class IPMessage implements Serializable {
    private static final long serialVersionUID = 1L;
    private String IPAddress;
    private String IPPort;
    private String IPType;
    private String IPSpeed;
    private int useCount;            // 使用计数器，连续三十次这个IP不能使用，就将其从IP代理池中进行清除

    public IPMessage() { this.useCount = 0; }

    public IPMessage(String IPAddress, String IPPort, String IPType, String IPSpeed) {
        this.IPAddress = IPAddress;
        this.IPPort = IPPort;
        this.IPType = IPType;
        this.IPSpeed = IPSpeed;
        this.useCount = 0;
    }

	public int getUseCount() {
        return useCount;
    }

	public void setUseCount() {
        this.useCount++;
    }

    public void initCount() {
        this.useCount = 0;
    }

    ... ...
}
```

可以看到，我给其中添加了`useCount`这一成员变量。我在使用xici代理网上的IP时发现，大部分的代理IP一次不能使用并不代表每次都不可使用，因此我在用代理IP进行网页抓取时的策略作出了如下的改变：

> 1. 当前代理IP如果解析当前任务失败，则将此代理IP中的useCount变量进行加1，并将此代理IP进行序列化之后，重新丢进IP代理池，切换至其他代理IP
> 2. 如果当前代理IP解析当前任务成功，则将此代理IP中的useCount变量置0，并且继续使用此代理对其它任务进行抓取，直到任务解析失败，然后重复第1点
> 3. 如果发现从IP代理池中取出的代理IP的useCount变量数值已为30，则对此代理IP进行舍弃，并切换至其他代理IP

具体的代码实现如下：

- **舍弃代理IP，flag用于判断是否需要从IP代理池中拿取新的IP**：

```java
/**
 * @Author: spider_hgyi
 * @Date: Created in 下午4:25 18-2-6.
 * @Modified By:
 * @Description: 负责解析带有页面参数的商品搜索页url，得到本页面中的商品id
 */
public class GoodsDetailsUrlThread implements Runnable {
    private final Object lock;                      // 用于与 ip-proxy-pool 进行协作的锁
    ... ...

    @Override
    public void run() {
        ... ...
        boolean flag = true;

        while (true) {
            if (flag) {
                synchronized (lock) {
                    while (myRedis.isEmpty()) {
                        try {
                            System.out.println("当前线程：" + Thread.currentThread().getName() + ", " +
                                    "发现ip-proxy-pool已空, 开始进行等待... ...");
                            lock.wait();
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }

                    ipMessage = myRedis.getIPByList();
                }
            }

            if (ipMessage.getUseCount() >= 30) {
                System.out.println("当前线程：" + Thread.currentThread().getName() + ", 发现此ip：" +
                        ipMessage.getIPAddress() + ":" + ipMessage.getIPPort() + ", 已经连续30次不能使用, 进行舍弃");
                continue;
            }
            ... ...
        }
    }
}
```

- **当前代理IP解析任务成功（失败），useCount置0（++），并持续使用此代理IP抓取新任务（将代理IP丢进IP代理池并拿取新IP）**：

```java
/**
 * @Author: spider_hgyi
 * @Date: Created in 下午4:25 18-2-6.
 * @Modified By:
 * @Description: 负责解析带有页面参数的商品搜索页url，得到本页面中的商品id
 */
public class GoodsDetailsUrlThread implements Runnable {
    ... ...

    @Override
    public void run() {
        ... ...

        while (true) {
            if (flag) {
                synchronized (lock) {
                    while (myRedis.isEmpty()) {
                        try {
                            System.out.println("当前线程：" + Thread.currentThread().getName() + ", " +
                                    "发现ip-proxy-pool已空, 开始进行等待... ...");
                            lock.wait();
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }

                    ipMessage = myRedis.getIPByList();
                }
            }
            
			... ...
			
			if (html != null) {
				... ...
                flag = false;
            } else {
	            // 当前任务解析失败，将当前任务重新放入任务队列中，并将flag置为true
                synchronized (tagBasicPageUrls) {
                    tagBasicPageUrls.offer(tagBasicPageUrl);
                }
                flag = true;
            }
        }
    }
}
```

```java
/**
 * Created by hg_yi on 17-5-23.
 *
 * @Description: 对淘宝页面的请求，得到页面的源码
 * setConnectTimeout：设置连接超时时间，单位毫秒.
 * setSocketTimeout：请求获取数据的超时时间，单位毫秒.如果访问一个接口，
 * 多少时间内无法返回数据，就直接放弃此次调用。
 */
public class HttpRequest {
    // 成功抓取淘宝页面计数器
    public static int pageCount = 0;

    // 使用代理IP进行网页的获取
    public static String getHtmlByProxy(String requestUrl, IPMessage ipMessage, Object lock) {
        ... ...

        try {
            ... ...

            // 得到服务响应状态码
            if (statusCode == 200) {
                ... ...
            } else {
                ... ...
            }
			// 只要能返回状态码，没有出现异常，则此代理IP就可使用
            ipMessage.initCount();
        } catch (IOException e) {
            ... ...
            ipMessage.setUseCount();
            synchronized (lock) {
                myRedis.setIPToList(ipMessage);
            }
        } finally {
            ... ...
        }

        return html;
    }
}

```

### **布隆过滤器**

在这篇博客中，详细的介绍了布隆过滤器的实现原理：[海量URL去重之布隆过滤器](http://blog.csdn.net/championhengyi/article/details/72885500)，我在将布隆过滤器应用到项目中的时候，有些方法发生了改变。

之所以将布隆过滤器在这里单独提出来，是因为想给大家提供自己之前写的有关布隆过滤器的实现原理。搞清楚原理之后，大家再看项目中布隆过滤器的相关实现，也就会轻松许多。

### **监控线程---tagBasicPageURLs-cache**

这个线程的主要作用是将Redis数据库中缓存的，已经成功解析过的任务，将其对应MySQL中所在的行记录中的flag位设置为true。在前面也说了，我将任务队列保存在了MySQL数据库中，其中对应的每一条记录，都有一个额外的标志位，flag。设置这一标志位的主要目的是，对爬虫系统做了一个简单的宕机恢复。我们应当对已经抓取过的任务做一定的标记手段，以防止在系统突然死机或其他突发状况下，需要重启项目的情况。这个时候，我们当然不可能对所有的任务重新进行抓取。

对于这个问题的处理，我在项目中的实现思路如下：

> 1. 在任务抓取线程：`thread-GoodsDetailsUrl-i`，主要用来解析商品ID的线程中，如果抓取完一个任务，就将这个任务先缓存到Redis数据库中，毕竟如果直接将这个任务在MySQL中所在的行记录中的flag置为true的话，效率就有点低下了
> 2. 设置监控线程：`tagBasicPageURLs-cache`，监控缓存在Redis数据库中已抓取过任务的数量，我设置的阈值是大于等于100，当然这个数字不绝对，因为线程调度是不可控的。但为了接近我所设置的这个阈值，我将此线程的优先级设置为最高
> 3. 监控线程开始工作，期间使用同步块保证任务抓取线程不得给Redis数据库中添加新的已经抓取成功的任务，以达到监控线程与任务抓取线程对Redis数据库操作之间的互斥性

具体的代码实现如下：

**监控线程---tagBasicPageURLs-cache**：

```
/**
 * @Author: spider_hgyi
 * @Date: Created in 上午11:51 18-2-6.
 * @Modified By:
 * @Description: 处理缓存的线程，将 tag-basic-page-urls 中存在的url标记进MySQL数据库中
 */
public class TagBasicPageURLsCacheThread implements Runnable {
    private final Object tagBasicPageURLsCacheLock;

    public TagBasicPageURLsCacheThread(Object tagBasicPageURLsCacheLock) {
        this.tagBasicPageURLsCacheLock = tagBasicPageURLsCacheLock;
    }

    public static void start(Object tagBasicPageURLsCacheLock) {
        Thread thread = new Thread(new TagBasicPageURLsCacheThread(tagBasicPageURLsCacheLock));
        thread.setName("tagBasicPageURLs-cache");
        thread.setPriority(MAX_PRIORITY);           // 将这个线程的优先级设置最大，允许出现误差
        thread.start();
    }

    @Override
    public void run() {
        MyRedis myRedis = new MyRedis();
        MySQL mySQL = new MySQL();

        while (true) {
            synchronized (tagBasicPageURLsCacheLock) {
                while (myRedis.tagBasicPageURLsCacheIsOk()) {
                    System.out.println("当前线程：" + Thread.currentThread().getName() + ", " +
                            "准备开始将 tag-basic-page-urls-cache 中的url在MySQL中进行标记");

                    List<String> tagBasicPageURLs = myRedis.getTagBasicPageURLsFromCache();
                    System.out.println("tagBasicPageURLs-size: " + tagBasicPageURLs.size());

                    // 将MySQL数据库中对应的url标志位置为true
                    mySQL.setFlagFromTagsSearchUrl(tagBasicPageURLs);
                }
            }
        }
    }
}
```

**任务抓取线程---thread-GoodsDetailsUrl-i**：（截取了部分代码）

```java
... ...
// 将tagBasicPageUrl写进Redis数据库
synchronized (tagBasicPageURLsCacheLock) {
	System.out.println("当前线程：" + Thread.currentThread().getName() + "，准备将tagBasicPageUrl写进Redis数据库，tagBasicPageUrl：" + tagBasicPageUrl);
	myRedis.setTagBasicPageURLToCache(tagBasicPageUrl);
}
... ...
```

**MyRedis中的tagBasicPageURLsCacheIsOk()方法**：

```java
// 判断 tagBasicPageURLs-cache 中的url数量是否达到100条
public boolean tagBasicPageURLsCacheIsOk() {
	tagBasicPageURLsCacheReadWriteLock.readLock().lock();
	Long flag = jedis.llen("tag-basic-page-urls-cache");
	tagBasicPageURLsCacheReadWriteLock.readLock().unlock();

	return flag >= 100;
}
```

其实，我为什么会称自己对宕机情况的发生做了简单的处理：这个解决方案并不完美，可以说存在很大的瑕疵。

我在将已经缓存至Redis数据库中，并解析完成的任务URL通过监控线程---tagBasicPageURLs-cache进行MySQL中相关标志位置true的时候，设置的是当Redis数据库中缓存的任务数量达到100及以上的时候，这个监控线程才会启动。

那么就会出现一种情况：Redis数据库中的URL数量没有达到100及以上，这个时候系统发生宕机，那么这些已经抓取过的URL在MySQL中所对应的flag标志位就不会被置为true。也就是说，在我们下次重新启动该系统的时候，这些已经抓取过的URL还会被重新抓取，并且每次存在的误差并无法严格判定，有可能没有误差，有可能误差达到了百条左右。

针对这个bug，目前博主还没有想到比较好的解决办法，相信日后会攻破它。