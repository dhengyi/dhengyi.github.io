---
title: Java网络爬虫--使用Jsoup的select语法进行元素查找
date: 2017-03-30 20:33:34
tags:
    - 网络爬虫
    - Jsoup
categories: Java网络爬虫
---

使用Jsoup进行元素的查找有两种方法。有使用DOM方法来遍历一个文档，也有使用选择器语法来查找元素，而后者类似于CSS或jQuery的语法来查找和操作元素。对于这两个方法到底使用哪个感觉好上手我觉得因人而异，在我尝试了两种方法之后我还是选择select，所以我就只总结select的语法使用了，对于DOM方法感兴趣的，可以看一下这一篇博客：[【使用JSOUP实现网络爬虫】使用DOM方法来遍历一个文档](http://blog.csdn.net/withiter/article/details/14166613)，看之前最好先了解一下[Java网络爬虫--HTML DOM（HTML 基础）](http://blog.csdn.net/championhengyi/article/details/58305723)。


----------
## **select详解**

Document 继承自 Element 类。select方法将返回一个Elements集合。

### **通过标签名查找**

测试代码：

```html
<span>33</span>
<span>25</span>
```
select写法：

```java
Elements elements = document.select("span");
```

**下面的例子都按照上面的格式来写，就不进行重复的标注了。**

### **通过id查找**

```html
<span  id=\"mySpan\">36</span>
<span>20</span>
```

```java
Elements elements = document.select("#mySpan");
//通过id来查找，使用方法跟css指定元素一样，用#
```

### **通过class名查找**

```html
<span class="myClass">36</span>
<span>20</span>
```

```java
Elements elements = document.select(".myClass");
// 使用方法跟css指定元素一样，用.
```

### **利用标签内属性名查找元素**

```html
<span class="class1" id="id1">36</span>
<span class="class2" id="id2">36</span>
```

```java
Elements elements = document.select("span[class=class1]span[id=id1]");
// 规则为 标签名【属性名=属性值】，多个属性即多个【】，如上
```

### **利用标签内属性名前缀查找元素**

```html
<span class="class1" >36</span>
<span class="class2" >22</span>
```

```java
Elements elements = document.select("span[^cl]");
// 规则为 标签名【^属性名前缀】，多个属性即多个【】
```

### **利用标签内属性名+正则表达式查找元素**

对正则表达式不了解的同学下去一定要学习正则表达式哦，因为它在爬虫中可是很重要的。

```html
<span class="ABC" >36</span>
<span class="ADE" >22</span>
```

```java
Elements elements = document.select("span[class~=^AB]");
// 规则为 标签名【属性名~=正则表达式】，以上的正则表达式的意思是查找class值以AB为开头的标签
```

### **利用标签文本包含某些内容查找元素**

```html
<span>36</span>
<span>22</span>
```

```java
Elements elements = document.select("span:contains(3)");
// 规则为 标签名:contains(文本值)
```

### **利用标签文本包含某些内容+正则表达式查找元素**

```html
<span>36</span>
<span>22</span>
```

```java
Elements elements = document.select("span:matchesOwn(^3)");
// 规则为 标签名:matchesOwn(正则表达式)，以上的正则表式的意思是以文本值以3为开头的标签
```

当然select还有其他强大的功能，如果对select感兴趣的同学可以查看select API，我只是列出了获取网页特定内容所需要的select的基本语法，基本上对于大部分的爬虫需求来说已经足够了。

下来给大家展示一个使用select获取特定元素值的代码：

```java
public class SelectDemo {
    public static void test(String html) {
        //采用Jsoup解析
        Document doc = Jsoup.parse(html);
        //System.out.println(html);

        //获取html标签中的内容
        Elements elements = doc.select("ul[class=gl-warp clearfix]")
                .select("li[class=gl-item]");

        for (Element ele : elements) {
            String JdbookID = ele.attr("data-sku");
            //out.println(JdbookID);
        }
    }
}
```

上面的代码是我爬京东图书提取图书的id的部分截取，可以看到select的用法与前面讲的没有什么区别。对于Element 这个类来说，如果我们要获取一个标签中的属性值或文本内容可以这样来做：

```java
for (Element ele : elements) {
    String JdbookID = ele.attr("data-sku");     //获取data-sku的属性值
    //out.println(JdbookID);
    String text = ele.text();                   //获取当前标签（元素）的文本值
    //out.println(text);
}
```