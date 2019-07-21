---
title: Java网络爬虫--HttpClient设置头部信息与模拟登录策略
date: 2017-03-26 23:44:56
tags:
    - 网络爬虫
    - 模拟登陆
    - HttpClient
categories: Java网络爬虫
---

在网络爬虫中我们经常需要设置一些头部信息，使我们进行网页抓取的行为更加像使用浏览器浏览网页一般，并且我们有时需要将头部信息设置正确，才能得到正确的数据，要不然有可能得到的信息和浏览器所展示的页面有出入。

设置头部还可以进行模拟登录，我们可以设置Cookie，来得到登录后的页面，来抓取我们需要的数据。

接下来我会讲到进行模拟登录的两种方法。


----------
## **添加头部Cookie进行模拟登录**

代码如下：

```java
import org.apache.http.Header;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

import java.io.IOException;

import static java.lang.System.out;

/**
 * Created by paranoid on 17-3-26.
 */
public class HttpClientDemo {
    public static void main(String[] args){
        //创建客户端
        CloseableHttpClient closeableHttpClient = HttpClients.createDefault();

        //创建请求Get实例
        HttpGet httpGet = new HttpGet("https://www.baidu.com");

        //设置头部信息进行模拟登录（添加登录后的Cookie）
        httpGet.setHeader("Accept", "text/html,application/xhtml+xml," +
                "application/xml;q=0.9,image/webp,*/*;q=0.8");
        httpGet.setHeader("Accept-Encoding", "gzip, deflate, sdch, br");
        httpGet.setHeader("Accept-Language", "zh-CN,zh;q=0.8");
        //httpGet.setHeader("Cookie", ".......");
        httpGet.setHeader("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" +
                " (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36");

        try {
            //客户端执行httpGet方法，返回响应
            CloseableHttpResponse closeableHttpResponse = closeableHttpClient.execute(httpGet);

            //得到服务响应状态码
            if (closeableHttpResponse.getStatusLine().getStatusCode() == 200) {
                //打印所有响应头
                Header[] headers = closeableHttpResponse.getAllHeaders();
                for (Header header : headers) {
                    out.println(header.getName() + ": " + header.getValue());
                }
            }
            else {
                //如果是其他状态码则做其他处理
            }
        } catch (ClientProtocolException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
	        httpClient.close();
        }
    }
}
```

只要在上述代码中添加了你登录后的Cookie就可以进行模拟登录啦，至于为什么添加了Cookie之后可以进行模拟登录，你可以在百度上搜索一下Cookie的机制与作用，相信你就明白了。

对于上述那些参数，大家可以在chrome的开发者工具里面进行获得，cookie是大家手动登录后产生的，也可以获得，设置了这些参数之后，我们既模拟了浏览器的行为又进行了模拟登录。

大家可以将没有添加Cookie的结果和添加了Cookie之后的结果进行比对，可以发现的确可以实现模拟登录。

我们接下来讨论实现模拟登录的另一种方法，比较麻烦，也有一定局限性（验证码），但却是使用最普遍的。具体选择哪种模拟登录的方式，到时你有项目需求了，就会明白～


----------
## **HttpClient发送Post请求**

我们既然需要模拟登录，那么登录时所必须的参数：“用户名”，“密码”等都是可以通过HttpClient发送给对方的服务器的，所以我说HttpClient模仿的就是浏览器的行为，它可以满足我们对Web访问的基本需求。接下来用代码告诉大家怎么手动设计登录时所必要的参数并发送给对方服务器。

```java
import org.apache.http.Header;
import org.apache.http.NameValuePair;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;

import static java.lang.System.out;

/**
 * Created by paranoid on 17-3-27.
 * 
 * 模拟登录人人网
 *
 * 提示：我们在模拟登录之前都要先手动登录然后通过抓包查看登录成功需要给对方服务器发送哪些参数，然后我们将这些参数进行提取，通过Post方法发送给* 对方服务器
 */
 
public class SimulationLoginDemo {
    public static void main(String[] args){
        //创建默认客户端
        CloseableHttpClient closeableHttpClient = HttpClients.createDefault();

        //创建Post请求实例
        HttpPost httpPost = new HttpPost("http://www.renren.com/");

        //创建参数列表
        List<NameValuePair> nvps = new ArrayList<>();
        nvps.add(new BasicNameValuePair("domain", "renren.com"));
        nvps.add(new BasicNameValuePair("isplogin", "true"));
        nvps.add(new BasicNameValuePair("submit", "登录"));
        nvps.add(new BasicNameValuePair("email", ""));
        nvps.add(new BasicNameValuePair("passwd", ""));

        //向对方服务器发送Post请求
        try {
            //将参数进行封装，提交到服务器端
            httpPost.setEntity(new UrlEncodedFormEntity(nvps, "UTF8"));
            CloseableHttpResponse httpResponse = closeableHttpClient.execute(httpPost);

            //如果模拟登录成功
            if(httpResponse.getStatusLine().getStatusCode() == 200) {
                Header[] headers = httpResponse.getAllHeaders();
                for (Header header : headers) {
                    out.println(header.getName() + ": " + header.getValue());
                }
            }
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        } catch (ClientProtocolException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            httpPost.abort();      //释放资源
        }
    }
}
```


----------
## **参考阅读**

[ 网络爬虫中的模拟登陆获取数据（实例教学）](http://blog.csdn.net/qy20115549/article/details/52249232)

[使用HttpClient模拟登录百度账号](http://baogege.info/2016/04/21/baidu-login-with-httpclient/)