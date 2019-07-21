---
title: Java网络爬虫--PhantomJs的使用及性能优化
date: 2017-10-10 22:29:57
tags:
    - 网络爬虫
    - PhantomJs
categories: Java网络爬虫
---

先说点题外话吧，在我刚开始学习爬虫的时候，有一次一个学长给了我一个需求，让我把京东图书的相关信息抓取下来。恩，因为真的是刚开始学习爬虫，并且是用豆瓣练得手，抓取了大概500篇左右的影评吧，然后存放到了mysql中，当时觉得自己厉害的不行，于是轻松的接下了这个需求。。。

然后信心满满的开始干活。。首先查看网页源代码。。。？？？我需要的东西源代码里面没有！！！然后去问了学长。学长给我说，这是AJAX产生的数据，大概听完之后我就去查了资料。发现网上大片的资料都在阐述一个道理，对于动态页面，使用PhantomJs进行抓取，但是这样效率很低。作为一个优秀的程序员，当时看见效率很低这四个字，那在我心里是绝对不能被允许的，所以我就采用了抓包的方式，查看AJAX数据所在的URL，对于这个模拟浏览器的方法也就一直搁置到现在。

但是既然知道了这个东西，哪有不去学习的道理。所以我抽出了一点时间看了一下关于Java方面使用PhantomJs的资料，现在分享给大家。

对了，其实做网络爬虫，页面上90%的数据都可以使用抓包进行获取。所以我还是鼓励大家直接请求自己所需数据所在的URL。毕竟这种方式虽然方便，但是效率低下。


----------
## **JS渲染与AJAX**

在学习这个东西之前我们首先得了解什么是JS渲染、什么是AJAX以及为何这两种数据我们在网页源码里面获取不到。

**依照我的理解**，JS渲染与AJAX是一种相辅相成的关系，AJAX负责异步从服务器端获取数据，拿到数据后再使用JS进行渲染，最后呈现给用户。由于在Java中，HttpClient只能请求简单的静态页面，并不能请求到页面完全加载好后由JS调用相关代码产生的异步数据，所以我们不能直接通过HttpClient获取AJAX与JS渲染产生的数据。此时按上面所说的推荐大家直接进行网络抓包拿到AJAX数据所在的URL，或者使用本文所说的PhantomJs渲染引擎。


----------
## **三大JS渲染引擎的比较**

在网上进行资料查阅的时候，我们经常会因为五花八门的答案而不知所措，这时候一是要保持一颗平静的心情，二就要考虑搜索问题的相关姿势，必要的时候还需要科学上网。

先不说本文所说的JS渲染引擎，单说在Java爬虫中HTTP请求的库简直就可以用五花八门来形容，Java的原生HttpURLConnection类，HttpClient第三方库等等... ...当然网络上提供了这么多方法，我们必须要进行选择，那么我们肯定想选择功能强大的，使用简单的类库。此时我们就应该在网上搜索对两个类库做相关比较的问题，来进行更好的选择，而不是随便挑一个学习就完事了，这样很有可能投入的学习成本与回报不成正比。

那么相信大家在准备使用JS引擎模拟浏览器的时候，在网上看过不仅有PhantomJs，还听说过Selenium，HtmlUnit这两个具有相同功能的东西。那么我们该如何选择呢？下图截选自其他网友的博客：

HtmlUnit | Selenium | PhantomJs
---|---|---
内置Rhinojs浏览器引擎，没有哪一款浏览器使用该内核，解析速度一般，解析JS/CSS差，无浏览器界面。 | Seleninum + WebDriver = Selenium基于本地安装的浏览器，需打开浏览器，需要引用相应的WebDriver，正确配置webdriver的路径参数，在爬取大量js渲染页面时明显不合适。 | 神器，短小精悍，可本地化运行，也可作为服务端运行，基于webkit内核，性能及表现良好，完美解析绝大部分页面。

这也是我选择讲述PhantomJs的原因。

网上PhantomJs和Selenium还经常成对出现，原因是Selenium封装了PhantomJs的一部分功能，Selenium又提供了Python的接口模块，在Python语言中可以很好地去使用Selenium，间接地就可以使用PhantomJs。然而，是时候抛弃Selenium+PhantomJs了，原因之一此封装的接口很久没有更新了（没人维护了），原因之二Selenium只实现了一部分PhantomJs功能，且很不完善。


----------
## **PhantomJs的使用**

我使用的Ubuntu16.04的开发环境，至于PhantomJs + Selenium的环境部署，网络上有大篇资料，我就在这里给大家引入一个链接，也不详细说明了：[ubuntu安装phantomjs](http://blog.csdn.net/u010843612/article/details/54702518)

关于PhantomJs和Selenium的介绍我也就不再详说，大家直接百度就可以了。我们直接来看一下在Java中应该怎么使用PhantomJs～

如果你没有使用Maven的话，就在网上下载第三方jar包。我们所需要的Maven依赖如下:

```xml
<!-- https://mvnrepository.com/artifact/org.seleniumhq.selenium/selenium-java -->
<dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>2.53.1</version>
    </dependency>

    <!-- https://mvnrepository.com/artifact/com.github.detro.ghostdriver/phantomjsdriver -->
    <dependency>
      <groupId>com.github.detro.ghostdriver</groupId>
      <artifactId>phantomjsdriver</artifactId>
      <version>1.1.0</version>
    </dependency>
```

接下来我们来看一下程序到底应该怎么写：

### **设置请求头**

```java
//设置必要参数
DesiredCapabilities dcaps = new DesiredCapabilities();
//ssl证书支持
dcaps.setCapability("acceptSslCerts", true);
//截屏支持
dcaps.setCapability("takesScreenshot", true);
//css搜索支持
dcaps.setCapability("cssSelectorsEnabled", true);
//js支持
dcaps.setJavascriptEnabled(true);
//驱动支持（第二参数表明的是你的phantomjs引擎所在的路径，使用whereis phantomjs可以查看）
dcaps.setCapability(PhantomJSDriverService.PHANTOMJS_EXECUTABLE_PATH_PROPERTY, "/usr/local/bin/phantomjs");
```

### **创建phantomjs浏览器对象**

```java
//创建无界面浏览器对象
PhantomJSDriver driver = new PhantomJSDriver(dcaps);
```

### **设置隐性等待**

```java
//设置隐性等待
driver.manage().timeouts().implicitlyWait(1, TimeUnit.SECONDS);
```

因为Load页面需要一段时间，如果页面还没加载完就查找元素，必然是查找不到的。最好的方式，就是设置一个默认等待时间，在查找页面元素的时候如果找不到就等待一段时间再找，直到超时。

以上三点是使用PhantomJs时需要注意的地方，大家可以看一下大致的整体程序：

```java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.phantomjs.PhantomJSDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriverService;
import org.openqa.selenium.remote.DesiredCapabilities;

import java.util.concurrent.TimeUnit;

/**
 * Created by hg_yi on 17-10-11.
 */
public class phantomjs {
    public static void main(String[] args) {
        //设置必要参数
        DesiredCapabilities dcaps = new DesiredCapabilities();
        //ssl证书支持
        dcaps.setCapability("acceptSslCerts", true);
        //截屏支持
        dcaps.setCapability("takesScreenshot", true);
        //css搜索支持
        dcaps.setCapability("cssSelectorsEnabled", true);
        //js支持
        dcaps.setJavascriptEnabled(true);
        //驱动支持（第二参数表明的是你的phantomjs引擎所在的路径）
        dcaps.setCapability(PhantomJSDriverService.PHANTOMJS_EXECUTABLE_PATH_PROPERTY,
                "/usr/bin/phantomjs-2.1.1-linux-x86_64/bin/phantomjs");
        //创建无界面浏览器对象
        PhantomJSDriver driver = new PhantomJSDriver(dcaps);

        //设置隐性等待（作用于全局）
        driver.manage().timeouts().implicitlyWait(1, TimeUnit.SECONDS);
        //打开页面
        driver.get("--------------------------------");
        //查找元素
        WebElement element = driver.findElement(By.id("img_valiCode"));

        System.out.println(element.getAttribute("src"));
    }
}
```

我成功的抓取到了网页源码里面没有的数据～

关于上面使用到的PhantomJSDriver类的相关API，大家直接看这篇资料即可，应该可以满足你的日常需求了：[webdriver API中文版](http://www.360doc.com/content/17/1011/17/48302374_694109515.shtml)（WebDriver的API同样适用于PhantomJSDriver）。


----------
## **PhantomJs的性能优化**

我们都知道使用PhantomJs这种无头浏览器进行网页源码的抓取是非常费时的，所以当我们决定使用这个工具并且对抓取速度还有一定要求的时候，就需要掌握对PhantomJs进行性能优化的能力。

### **设置参数**
Google，Baidu半天，还看了一点官方文档，还是找不到PhantomJs相关的Java调用API文档，好吧，先扔一篇Python的，以后找到这方面的内容再进行补充吧～～～

[【phantomjs系列】Selenium+Phantomjs性能优化](https://thief.one/2017/03/01/Phantomjs%E6%80%A7%E8%83%BD%E4%BC%98%E5%8C%96/)