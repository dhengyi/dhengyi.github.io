---
title: Java网络爬虫--JSON数据的解析
date: 2017-04-02 20:42:45
tags:
    - FastJson
categories: Java网络爬虫
---

有时候，我们抓取下来一个html页面，发现浏览器页面可以显示的东西在html源码中却没有，这时候我们就要考虑服务器是以JSON格式将这部分数据发送到客户端的，对于这种情况的处理方式我们一般是在chrome的开发者工具中找到对应的JSON包，然后构建其URL，对JSON数据所在的源地址进行访问，然后使用一些工具对JSON数据进行解析，从而得到我们想要的东西。

阿里巴巴FastJson是一个Json处理工具包，包括“序列化”和“反序列化”两部分，它具备如下特征：

速度最快，测试表明，FastJson具有极快的性能，超越任其他的Java Json parser。包括自称最快的JackJson；功能强大，完全支持Java Bean、集合、Map、日期、Enum，支持范型，支持自省；无依赖，能够直接运行在Java SE 5.0以上版本；支持Android；开源 (Apache 2.0)

源码地址：https://github.com/alibaba/fastjson

FastJson下载地址：http://download.csdn.net/detail/pdsyzbaozi/8199419


----------
## **FastJson使用**

Fastjson API入口类是com.alibaba.fastjson.JSON，常用的序列化操作都可以在JSON类上的静态方法直接完成。

```java
public static final Object parse(String text); // 把JSON文本parse为JSONObject或者JSONArray 
public static final JSONObject parseObject(String text); //把JSON文本parse成JSONObject    
public static final  T parseObject(String text, Class clazz); // 把JSON文本parse为JavaBean 
public static final JSONArray parseArray(String text); // 把JSON文本parse成JSONArray 
public static final  List parseArray(String text, Class clazz); //把JSON文本parse成JavaBean集合 
public static final String toJSONString(Object object); // 将JavaBean序列化为JSON文本 
public static final String toJSONString(Object object, boolean prettyFormat); // 将JavaBean序列化为带格式的JSON文本 
public static final Object toJSON(Object javaObject); //将JavaBean转换为JSONObject或者JSONArray。
```

首先给大家一个我在知乎上看到的有关JavaBean的解释（看百度百科我也是很迷茫... ...）感觉这个很言简意赅，它就是一个Java类：

1. 所有属性为private
2. 提供默认构造方法
3. 提供getter和setter
4. 实现serializable接口

下来我上具体的代码：

```java
/**
 * Created by paranoid on 17-4-2.
 */
public class TestPerson {
    private int age;
    private String name;

    public TestPerson() {

    }

    public TestPerson(int age, String name) {
        this.age = age;
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
```

```java
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;

import java.util.ArrayList;
import java.util.List;

import static java.lang.System.out;

/**
 * Created by paranoid on 17-4-2.
 *
 * fastJson在反序列化的时候需要调用对象的默认构造方法，如果该对象之中还包含其他的对象，
 * 那么都需要创建默认的无参构造方法.
 */

public class TestFastJson {
    public static void main(String[] args) {
        TestPerson testPerson = new TestPerson(19, "李明");

        List<TestPerson> list = new ArrayList<>();

        list.add(testPerson);
        list.add(new TestPerson(12, "张三"));
        
        //将集合或对象序列化为Json
        out.println(JSON.toJSON(testPerson));
        out.println(JSON.toJSON(list));

        //JSON串反序列化为对象
        TestPerson person = JSON.parseObject("{\"age\":19,\"name\":\"李明\"}",
                TestPerson.class);
        out.printf("name:%s, age:%d\n", person.getName(), person.getAge());

        //字符串对象反序列化成集合
        String str = "[{\"name\":\"李明\",\"age\":19},{\"name\":\"张三\",\"age\":12}]";
        List<TestPerson> listPerson = JSON.parseArray(str,TestPerson.class);

        for(TestPerson item : listPerson){
            out.println(item.getName() );
            out.println(item.getAge());
        }

        //没有对象直接解析JSON对象(常用)
        JSONObject jsonObject = JSON.parseObject("{\"name\":\"李明\",\"age\":19}");
        System.out.printf("name: %s, age: %d\n", jsonObject.getString("name"),
                jsonObject.getBigInteger("age"));

        //没有对象直接解析JSON数组
        JSONArray jsonArray = JSON.parseArray("[{\"name\":\"李明\",\"age\":19}," +
                "{\"name\":\"张三\",\"age\":12}]");

        for(int i = 0; i < jsonArray.size(); i++){
            JSONObject temp =  jsonArray.getJSONObject(i);
            System.out.printf("name: %s, age: %d\n", temp.getString("name"),
                    temp.getBigInteger("age"));
        }

        for(Object obj : jsonArray){
            System.out.println(obj.toString());
        }
    }
}
```


----------
## **参考阅读**

[Java的Json解析包FastJson使用](http://www.cnblogs.com/wgale025/p/5875430.html)