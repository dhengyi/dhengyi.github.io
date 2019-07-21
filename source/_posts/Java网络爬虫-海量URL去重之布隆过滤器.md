---
title: Java网络爬虫--海量URL去重之布隆过滤器
date: 2017-06-06 19:40:14
tags:
    - 网络爬虫
    - 布隆过滤器
categories: Java网络爬虫
---

## **简介布隆过滤器**

当我们要对海量URL进行抓取的时候，我们常常关心一件事，就是URL的去重问题，对已经抓取过的URL我们不需要在进行重新抓取。在进行URL去重的时候，我们的基本思路是将拿到的URL与已经抓取过的URL队列进行比对，看当前URL是否在此队列中，如果在已抓取过的队列中，则将此URL进行舍弃，如果没有在，则对此URL进行抓取。看到这，如果有哈希表基础的同学，很自然的就会想到那么如果用哈希表对URL进行存储管理的话，那么我们对于URL去重直接使用HashSet进行URL存储不就行了。事实上，在URL非海量的情况下，这的确是一种很不错的方法，但哈希表的缺点很明显：费存储空间。

对于像Gmail那样公众电子邮件提供商来说，总是需要过滤掉来自发送垃圾邮件的人和来及邮件的E-mail地址。然而全世界少说也有几十亿个发垃圾邮件的地址，将他们都存储起来需要大量的网络服务器。如果用哈希表，每存储一亿个E-mail地址，就需要1.6GB的内存（用哈希表实现的具体实现方式是将每一个E-mail地址对应成一个八字节的信息指纹，然后将这个信息存储在哈希表中，但是由于哈希表的存储效率一般只有50%，一旦存储空间大于表长的50%，查找速度就会明显的下降（容易发生冲突），即存储一个E-mail我们需要给它分配十六字节的大小，一亿个地址的大小大约就要1.6GB内存）。因此存储几十亿的地址就要需要大约上百GB的内存，除非是超级计算机，一般服务器是无法存储的。

关于哈希表的相关知识，请戳这篇博客---**[查找--理解哈希算法并实现哈希表](http://blog.csdn.net/championhengyi/article/details/72834757)**


----------
## **具体实现思想**

在这种情况下，巴顿·布隆在1970年提出了布隆过滤器，它只需要哈希表的1/8到1/4的大小就可以解决同样的问题。我们来看一下其工作原理：

首先我们需要一串很长的二进制向量，与其说是二进制向量，我觉得不如说是一串很长的“位空间”，其具体原理大家可以了解一下Java中BitSet类的算法思想。它用位空间来存储我们平常的整数，可以将数据的存储空间急剧压缩。然后需要一系列随机映射函数（哈希函数）来将我们的URL映射成一系列的数，我们将其称为一系列的“**信息指纹**”。

然后我们需要将刚才产生的一系列信息指纹对应至布隆过滤器中，也就是我们刚才设置的那一串很长的位空间（二进制向量）中。位空间中各个位的初始值为0。我们需要将每个信息指纹都与其布隆过滤器中的对应位进行比较，看看其标志位是否已经被设置过，如果判断之后发现一系列的信息指纹都已被设置，那么就将此URL进行过滤**（说明此URL可能存在于布隆过滤器中）**。事实上，我们将每个URL用随机映射函数来产生一系列的数之所以能被称之为信息之纹，就是因为这一系列的数基本上是独一无二的，每个URL都有其独特的指纹。虽然布隆过滤器还有极小的可能将一个没有抓取过的URL误判为已经抓取过，但它绝对不会对已经抓取过的URL进行重新抓取。然后刚才的误判率一般来说我们基本上可以忽略不计，等下我给大家列出一张表格大家直观感受一下。

对于为什么会出现误判的情况，请参考此篇博客---**[布隆过滤器(Bloom Filter)的原理和实现](https://www.cnblogs.com/cpselvis/p/6265825.html)**


----------
## **算法总结**

现在我们来总结一下该怎么设计一个布隆过滤器：

1. 创建一个布隆过滤器，开辟一个足够的位空间（二进制向量）；
2. 设计一些种子数，用来产生一系列不同的映射函数（哈希函数）；
3. 使用一系列的哈希函数对此URL中的每一个元素（字符）进行计算，产生一系列的随机数，也就是一系列的**信息指纹**；
4. 将一系列的信息指纹在布隆过滤器中的相应位，置为1。


----------
## **代码实现（Java）**

```java
import static java.lang.System.out;

public class SimpleBloomFilter {
    // 设置布隆过滤器的大小
    private static final int DEFAULT_SIZE = 2 << 24;
    // 产生随机数的种子，可产生6个不同的随机数产生器
    private static final int[] seeds = new int[] {7, 11, 13, 31, 37, 61};
    // Java中的按位存储的思想，其算法的具体实现（布隆过滤器）
    private BitSet bits = new BitSet(DEFAULT_SIZE);
    // 根据随机数的种子，创建6个哈希函数
    private SimpleHash[] func = new SimpleHash[seeds.length];

    // 设置布隆过滤器所对应k（6）个哈希函数
    public SimpleBloomFilter() {
        for (int i = 0; i < seeds.length; i++) {
            func[i] = new SimpleHash(DEFAULT_SIZE, seeds[i]);
        }
    }

    public static void main(String[] args) {
        String value = "stone2083@yahoo.cn";
        SimpleBloomFilter filter = new SimpleBloomFilter();

        out.println(filter.contains(value));

    }

    public static class SimpleHash {
        private int cap;
        private int seed;

        // 默认构造器，哈希表长默认为DEFAULT_SIZE大小，此哈希函数的种子为seed
        public SimpleHash(int cap, int seed) {
            this.cap = cap;
            this.seed = seed;
        }

        public int hash(String value) {
            int result = 0;
            int len = value.length();

            for (int i = 0; i < len; i++) {
                // 将此URL用哈希函数产生一个值（使用到了集合中的每一个元素）
                result = seed * result + value.charAt(i);
            }

            // 产生单个信息指纹
            return (cap - 1) & result;
        }
    }

    // 是否已经包含该URL
    public boolean contains(String value) {
        if (value == null) {
            return false;
        }

        boolean ret = true;
        // 根据此URL得到在布隆过滤器中的对应位，并判断其标志位（6个不同的哈希函数产生6种不同的映射）
        for (SimpleHash f : func) {
            ret = ret && bits.get(f.hash(value));
        }

        return ret;
    }
}
```

代码的注解已经足够详细，如果大家还有什么疑惑，可以在评论区进行讨论交流～～


----------
## **布隆过滤器误判率表**

![这里写图片描述](布隆过滤器误判率表.png)