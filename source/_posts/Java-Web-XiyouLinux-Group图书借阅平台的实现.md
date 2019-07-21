---
title: Java Web--XiyouLinux Group图书借阅平台的实现
date: 2018-03-13 00:22:30
tags: 项目
categories: 后端开发
---

**源码地址：[XiyouLinux Group 图书借阅平台](https://github.com/championheng/book-manager)**

项目地址中包含了一份README，因此对于项目的介绍省去部分内容。这篇博客，主要讲述项目中各个模块的实现细节。


----------
## **项目概述及成果**

首先将本项目使用到技术罗列出来：

> 1. 使用Spring + Spring MVC进行后台开发
> 2. 使用Bootstrap和jQuery框架进行前端开发
> 3. 使用自定义注解与自定义的JdbcRowMapper简化JdbcTemplate对数据库的操作
> 4. 使用腾讯云的对象存储服务进行图书照片的远程存储
> 5. 使用MD5加密算法对用户密码在后台进行加密存储
> 6. 使用过滤器进行一个会话中的身份校验
> 7. 手动从Spring容器中获取bean
> 8. 数据库设计中的诸多细节... ...

由于前端开发是由团队中的其他人在负责，在加上博主对前端这块并不了解，因此本篇博客并不讨论有关第二点技术实现上的细节。

本项目如README中所述，在后期还有许多需要进行优化的地方。如果你对本项目感兴趣，不妨在GitHub中将其Star，以获得对本项目的持续关注～

至于项目成果大家可以阅读README，我在其中有贴上程序运行后的部分截图。或直接在本地搭建环境，运行此项目。过程中如有任何疑问，你也可以联系我：

```
spider_hgyi@outlook.com
```

关于项目的整体架构我也不再描述，README中对其进行了补充。


----------
## **项目背景**

这个项目的产生是有需求背景的。我们旨在为XiyouLinux Group开发一个管理图书借阅与归还的平台，从而能对小组中存在的大量书籍进行有效的管理。

我们的“老一届boss”刚开始给我们提出了第一版的需求，在此需求上，我们最初使用Servlet + JSP的方式进行后台开发。当然第一版由于太low我们对其进行了阉割。在我们学习了Spring与Spring MVC之后，就开始打算对其进行**version 2.0**的开发，并找来了一个专门学习前端的小可爱，才有了当前的图书借阅平台。

此图书借阅平台实现的功能模块请大家移步至**[README](https://github.com/championheng/book-manager)**进行查看。

接下来，我就按照每个模块的顺序，给大家讲一下本项目中用到的重点技术及其实现细节。


----------
## **实现细节**

**注：博主只会挑几个重点模块去进行讲述，因此有些模块将不会涉及到。**

### **模块一：登录模块**

登录模块分为三个部分，登录前主页面、登录后主页面以及登录框。

在这里我给大家截一张图看一下登录前后主页面的功能差距：	

登录前：
![这里写图片描述](图书借阅系统未登录主页.png)

登录后：
![这里写图片描述](图书借阅系统登录后主页.png)

我对登录后的页面只截取了和登录前有不同功能的区域。效果展示完毕，那么接下来就谈一谈这个模块中使用到的技术及其实现细节（只需考虑登录后页面实现的功能即可）。

#### **分页功能的实现**

作为一个展示信息的Web页面，怎么可能没有分页功能呢，只不过是由于上图中的测试数据太少，没有给大家展现出来罢了。我们使用的是传统分页功能，而传统分页中又分为“真分页”与“假分页”：

> - 真分页：每次从数据库中只返回当前页的数据，然后将数据交由视图进行渲染
> - 假分页：从数据库中拿取所有需要或将要展示的数据，将数据交由视图，由视图实现数据的分页功能（JS实现或JSTL实现）

我们也很容易判断出哪种情况下何种方法最优：

> 如果数据量较小，使用假分页的效果会更优；如果数据量庞大，使用真分页的效果更优。

本项目使用的是“真分页”，我们接下来看一下实现思路与实现代码：

实现思路：

> 1. 首先我们需要一个存储页面信息的Java Bean，也就是传统的Java对象
> 2. 使用GET方法进行页面跳转请求，也就是说，我们可以从URL中得到当前页面是第几页
> 3. 在后台中进行逻辑构造，将Java Bean中的实例字段进行部分（完全）填充
> 4. 使用Java Bean所提供的页面信息，构造相应的SQL语句，拿到当前页数据
> 5. 使用TreeMap对数据进行时间维度上的排序，最终返回给视图进行渲染

实现代码：

- **存储页面信息的Java Bean：**

```java
/**
 * Created by dela on 12/27/17.
 */
public class PagePO {
    private int everyPage;      // 每页显示记录数
    private int totalCount;     // 总记录数
    private int totalPage;      // 总页数
    private int currentPage;    // 当前页
    private int beginIndex;     // 查询起始点
    private boolean hasPrePage; // 是否有上一页
    private boolean hasNexPage; // 是否有下一页

    public PagePO() { }

    public PagePO(int currentPage) {
        this.currentPage = currentPage;
        this.everyPage = 5;
        this.beginIndex = (currentPage - 1) * everyPage;
    }

    public PagePO(int currentPage, int everyPage) {
        this.currentPage = currentPage;
        this.everyPage = everyPage;
        this.beginIndex = (currentPage - 1) * everyPage;
    }

    ... ...

    public int getEveryPage() {
        return everyPage;
    }

    public void setEveryPage(int everyPage) {
        this.everyPage = everyPage;
    }

    ... ...

    public boolean isHasPrePage() {
        return hasPrePage;
    }

    public void setHasPrePage(boolean hasPrePage) {
        this.hasPrePage = hasPrePage;
    }

    ... ...

    @Override
    public String toString() {
        return "PagePO{" +
                "everyPage=" + everyPage +
                ", totalCount=" + totalCount +
                ", totalPage=" + totalPage +
                ", currentPage=" + currentPage +
                ", beginIndex=" + beginIndex +
                ", hasPrePage=" + hasPrePage +
                ", hasNexPage=" + hasNexPage +
                '}';
    }
}
```

- **从URL中得到当前页面是第几页，进行逻辑处理，填充上面Java Bean中的部分实例字段：**

```java
/**
 * Created by dela on 1/21/18.
 *
 * @Description: 登录后主页面对应的控制器
 */

@Controller
@RequestMapping("/auth")
public class MainController {
    ... ...

    @RequestMapping(value = {"", "/", "/page/{currentPagePre}"}, method = RequestMethod.GET)
    public String getMainPage(Model model, @PathVariable(value = "currentPagePre", required = false) String currentPagePre,
                              @RequestParam(value = "tag", required = false) String labelIdPre) {
        ... ...

		// 得到当前页面的页码
        int currentPage = 1;
        if (currentPagePre != null) {
            currentPage = Integer.parseInt(currentPagePre);
        }
        PagePO pagePO = new PagePO(currentPage);

        ... ...

		// 得到当前分类下的数据总数（默认无分类）
        if (labelId == -1) {
            bookCount = bookInfoService.getBookCount();
        } else {
            bookCount = bookInfoService.getBookCountByLabelId(labelId);
        }
        pagePO.setTotalCount(bookCount);
        pagePO.setTotalPage((bookCount % 5 == 0) ? bookCount / 5 : bookCount / 5 + 1);

		// 根据页面信息构造SQL语句，拿取当前页的数据
		... ...

        // 对获取到的信息进行排序（按时间维度）
        ... ...

		... ...

        /**
         * 分页在后台中的逻辑处理主要是以下部分：
         */
         
        // 在这里添加分页的逻辑是因为JSP页面中EL表达式对算数运算的支持不太良好
        model.addAttribute("ELPageValue", (currentPage - 1) / 5 * 5);

        // 当总页数大于5时，需要如下属性
        if (pagePO.getTotalPage() >= 6) {
            model.addAttribute("isOneOfNextFivePage", (pagePO.getTotalPage() - 1) / 5 * 5 + 1);
            model.addAttribute("reachNextFivePage", (currentPage + 4) / 5 * 5 + 1);
        }

        // 当前页面大于等于6页的时候, 需要显示"[...]"按钮--返回到前一个5页
        if (currentPage >= 6) {
            model.addAttribute("returnPreFivePage", (currentPage - 1) / 5 * 5 - 4);
        }

        ... ...
    }
}
```

- **根据页面信息构造SQL语句，拿取当前页的数据：**

```java
/**
 * Created by dela on 11/23/17.
 */

@Repository
public class BookInfoServiceImpl implements BookInfoService {
    private JdbcOperations jdbcOperations;
	private final static String GET_ONE_PAGE_BOOKINFO = "SELECT * FROM book_info WHERE amount > 0 ORDER BY pk_id DESC LIMIT ?, ?";

	@Override
    public List<BookInfoPO> getBookByPage(PagePO page) {
        return jdbcOperations.query(GET_ONE_PAGE_BOOKINFO,
                JdbcRowMapper.newInstance(BookInfoPO.class), page.getBeginIndex(), page.getEveryPage());
    }
}
```

- **对获取到的信息进行排序：（按时间维度）**

```java
public class BookUserMapUtil {
    public static Map<BookInfoPO, String> getBookInfo(List<BookInfoPO> bookInfoPOS, UserService userService) {
        ... ...
        // TreeMap可对数据进行排序，当然BookInfoPO要实现Comparable接口，并重写compareTo方法
        Map<BookInfoPO, String> bookMap = new TreeMap<BookInfoPO, String>();

        ... ...

        return bookMap;
    }
}
```

- **JSP页面中对应的分页实现（JSTL与EL）：**

```html
<!--分页的实现-->
<div id="index_pingination">
  <ul class="pagination">
  
    <!--当当前页面不是第一页的时候, 要显示 "首页"和 "<<"按钮-->
    <c:if test="${pageInfo.currentPage != 1 && pageInfo.totalPage != 0}">
      <c:if test="${labelId == -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/1">首页</a></li>
        <li>
          <a href="${pageContext.request.contextPath}/page/${pageInfo.currentPage-1}">&laquo;</a></li>
      </c:if>
      <c:if test="${labelId != -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/1?tag=${labelId}">首页</a></li>
        <li>
          <a href="${pageContext.request.contextPath}/page/${pageInfo.currentPage-1}?tag=${labelId}">&laquo;</a></li>
      </c:if>
    </c:if>
    
    <!--当当前页面大于等于6页的时候, 要显示 "[...]"按钮--返回到前一个5页-->
    <c:if test="${pageInfo.currentPage >= 6}">
      <c:if test="${labelId == -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/${returnPreFivePage}">[...]</a></li>
      </c:if>
      <c:if test="${labelId != -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/${returnPreFivePage}?tag=${labelId}">[...]</a></li>
      </c:if>
    </c:if>
    
    <!--显示当前页面所有应显示的页码-->
    <c:forEach varStatus="i" begin="${ELPageValue+1}" end="${ELPageValue+5}" step="${1}">
      <c:if test="${i.current <= pageInfo.totalPage}">
      
        <!--当前页的超链接处理为不可点击-->
        <c:if test="${i.current == pageInfo.currentPage}">
          <li class="pa_in">
            <a disabled="true">${pageInfo.currentPage}</a></li>
        </c:if>
        <c:if test="${i.current != pageInfo.currentPage}">
          <c:if test="${labelId == -1}">
            <li>
              <a href="${pageContext.request.contextPath}/page/${i.current}">${i.current}</a></li>
          </c:if>
          <c:if test="${labelId != -1}">
            <li>
              <a href="${pageContext.request.contextPath}/page/${i.current}?tag=${labelId}">${i.current}</a></li>
          </c:if>
        </c:if>
      </c:if>
    </c:forEach>
    
    <!--如果不是最后一个五页中的页码, 要在后面显示[...]按钮--跳到下一个5页-->
    <c:if test="${pageInfo.currentPage < isOneOfNextFivePage && pageInfo.totalPage >= 6}">
      <c:if test="${labelId == -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/${reachNextFivePage}">[...]</a></li>
      </c:if>
      <c:if test="${labelId != -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/${reachNextFivePage}?tag=${labelId}">[...]</a></li>
      </c:if>
    </c:if>
    
    <!--如果不是尾页, 要显示 ">>"和 "尾页"按钮-->
    <c:if test="${pageInfo.currentPage != pageInfo.totalPage && pageInfo.totalPage != 1 && pageInfo.totalPage != 0}">
      <c:if test="${labelId == -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/${pageInfo.currentPage+1}">&raquo;</a></li>
        <li>
          <a href="${pageContext.request.contextPath}/page/${pageInfo.totalPage}">尾页</a></li>
      </c:if>
      <c:if test="${labelId != -1}">
        <li>
          <a href="${pageContext.request.contextPath}/page/${pageInfo.currentPage+1}?tag=${labelId}">&raquo;</a></li>
        <li>
          <a href="${pageContext.request.contextPath}/page/${pageInfo.totalPage}?tag=${labelId}">尾页</a></li>
      </c:if>
    </c:if>
  </ul>
</div>
```

#### **登录校验之过滤器实现**

既然系统具有登录功能，那么我们就需要注意一些事情：

> - 怎么防止未登录的用户访问登录后的页面
> - 用户的cookie失效之后，我们需要引导用户进行重新登录

为了解决这两个问题，就需要引入过滤器。关于过滤器的功能与在Serlvet中的使用请移步至这一篇博客：**[Servlet--Servlet进阶API、过滤器、监听器](http://blog.csdn.net/championhengyi/article/details/72860657)**

我现在要说的是过滤器在Spring框架中的使用，先看实现代码，并不难理解：

```
/**
 * Created by dela on 1/18/18.
 *
 * @Description: 对于想要在Spring中使用过滤器, 就要继承OncePerRequestFilter
 * OncePerRequestFilter, 顾名思义, 就是每个请求只通过一次这个过滤器
 */

public class LoginFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse,
                                    FilterChain filterChain) throws ServletException, IOException {
        final String INDEX_PAGE = "/";    // 未登录的URL
        Object sessionId = null;

        HttpSession session = httpServletRequest.getSession(false);

		// 未登录和Cookie失效的处理机制
        if (session != null) {
            sessionId = session.getAttribute("uid");
            if (sessionId != null) {
                filterChain.doFilter(httpServletRequest, httpServletResponse);
            }
        }

        // 如果当前操作的用户没有登录令牌, 那就弹出弹框提示重新登录, 并跳转到未登录页面
        if (session == null || sessionId == null) {
            // 设置response的字符集, 防止乱码
            httpServletResponse.setCharacterEncoding("GBK");

            PrintWriter out = httpServletResponse.getWriter();
            String builder = "<script language=\"javascript\">" +
                    "alert(\"网页过期，请重新登录！\");" +
                    "top.location='" +
                    INDEX_PAGE +
                    "';" +
                    "</script>";

            out.print(builder);
        }
    }
}
```

有两个问题需要解决～

**1.什么叫做每个请求只通过一次这个过滤器。Filter不都是仅仅经过一次的吗？** 

不是的！不然就不会有这个类了。

此方式是为了兼容不同的Web容器，特意而为之，也就是说并不是所有的Web容器都像我们期望的只过滤一次，Servlet版本不同，表现也不同。 

如，Servlet2.3与Servlet2.4也有一定差异 ：

在Servlet-2.3中，Filter会过滤一切请求，包括服务器内部使用forward转发请求和`<%@ include file=“/index.jsp”%>`的情况。

到了Servlet-2.4中Filter默认下只拦截外部提交的请求，forward和include这些内部转发都不会被过滤，但是有时候我们需要forward的时候也要用到Filter。

因此，为了兼容各种不同的运行环境和版本，默认Filter继承OncePerRequestFilter是一个比较稳妥的选择。

**2.有关`HttpSession session = httpServletRequest.getSession(false)`的一点小知识。**

现实中我们经常会遇到以下3中用法：

```java
HttpSession session = request.getSession();
HttpSession session = request.getSession(true);
HttpSession session = request.getSession(false);
```

他们之间的区别是什么？

getSession(boolean create)意思是返回当前reqeust中的HttpSession，如果当前request中的HttpSession为null且create为true，就创建一个新的HttpSession，否则就直接返回null。

**简而言之：** 

> - `request.getSession(true)`等同于如果当前没有HttpSession还要新创建一个HttpSession
> - `request.getSession(false)`则等同于如果当前没有HttpSession就直接返回null

那么我们在使用的时候：

> - 当向HttpSession中存储登录信息时，一般建议：`HttpSession session = request.getSession(true)`
> - 当从HttpSession中获取登录信息时，一般建议：`HttpSession session = request.getSession(false)`

**还有一种更简洁的方式：**

> 如果你的项目中使用到了Spring，对Session的操作就方便多了。如果需要在Session中取值，可以用WebUtils工具的getSessionAttribute(HttpServletRequestrequest, String name)方法，看看源码：

```java
public static Object getSessionAttribute(HttpServletRequest request, String name) {  
	Assert.notNull(request, "Request must not be null");  
	HttpSession session = request.getSession(false);
	
	return (session != null ? session.getAttribute(name) : null);  
}
```

使用时：

```java
WebUtils.setSessionAttribute(request, “user”, User)；
User user = (User) WebUtils.getSessionAttribute(request, “user”);
```

#### **密码加密之MD5算法**

也许你没有听过MD5加密算法，但是有些人看到这个标题首先会产生一个疑问：**对密码为什么还要加密？**

> 主要是从安全性的角度上考虑，我们知道如果不对密码进行加密，那么密码将会在后台以明文的形式存储到数据库中。如果你的数据库足够安全，保证不会被别人所侵略，这当然没有什么问题。但事实是，我们不得不小心SQL注入等一系列数据库安全性问题，这时候，在数据库中所存储的有关个人隐私的信息，就显得十分重要了。因此将密码在后台进行加密，对于真正的企业级开发来说，是一件不可或缺的事情。

解决掉这个疑惑之后，让我们一起来看看MD5加密算法的核心思想及代码实现。

好吧，博主看了一些关于MD5的核心思想，并没有看懂，先在这里给大家放一篇讲述MD5加密算法实现原理的博客链接：**[MD5算法原理](http://blog.csdn.net/forgotaboutgirl/article/details/7258109)** --- 博客中有少量错误，大家理性阅读。

关于MD5在Java中的使用，则要简单许多：

> 1. 通过MessageDigest.getInstance()确定加密算法，MessageDigest不止提供MD5
> 2. 调用`update(byte[] input)`对指定的byte数组更新摘要
> 3. 执行`digest()`方法进行哈希计算。在调用此方法之后，摘要被重置
> 4. 对第三步返回的结果进行处理：128位级联值（16组有符号字节值）--->将每组10进制数字转换为16进制，并生成相应字符串

```java
/**
 * @Author: spider_hgyi
 * @Date: Created in 上午11:53 18-3-11.
 * @Modified By:
 * @Description: MD5加密算法
 */
public class MD5 {
    public static String codeByMD5(String inStr) {
        MessageDigest md5;
        try {
            // 得到MD5加密算法实例
            md5 = MessageDigest.getInstance("MD5");
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 使用指定的byte数组更新摘要
        assert md5 != null;
        md5.update(inStr.getBytes());
        
        // 通过执行诸如填充之类的最终操作完成哈希计算。返回值是16个有符号字节数，共128位
        byte[] md5Bytes = md5.digest();

		// 用于存储最终得到的32位小写16进制字符串
        StringBuilder hexValue = new StringBuilder();

        // 将其中的字节转换为16进制字符
        for (byte md5Byte : md5Bytes) {
	        // 将得到的有符号字节转换为无符号字节
            int val = ((int) md5Byte) & 0xff;
            if (val < 16) {
                hexValue.append("0");
            }
            hexValue.append(Integer.toHexString(val));
        }

        return hexValue.toString();
    }
}
```

以上代码生成小写16进制字符串，代码运行结果经过本人与在线MD5加密网站生成的结果进行了对比，测试无误，可放心使用。

### **模块二：标签页模块**

效果展示：
![这里写图片描述](图书借阅系统标签显示页面.png)

#### **目录树结构的数据库设计**

在标签页这一模块中，我们主要对在MySQL数据库中如何存储一个树状结构而进行一个简单的介绍。

我在项目中设计的存储结构并不高效，是一种最简单且基本的实现。在网上有很多结构良好且性能高效的树形结构的数据库表设计，大家可以查阅一些相关资料。

对比上面的效果展示图，我的标签分类其实就是三层树深度：

> 1. 根节点（唯一）
> 2. 一级标签（大数据与云计算... ...）（多节点）
> 3. 二级标签（Hadoop、Spark等等）（多节点）

可以看到，虽然树的深度只有3，但其每个父节点都拥有多个子节点。

既然已经将标签信息组织成多路树结构，那么数据库结构设计如下：

```
pk_id              name              parent_id
```

pk_id用来标识此标签名的唯一索引，name就是标签名，parent_id则是此标签其父节点对应的pk_id。

我将一级标签的parent_id都设置为0，表明一级标签的父节点提供空数据，标签页只需要一级标签及二级标签的信息。

如此，我们便可查找任一一级标签信息及其所拥有的二级标签信息。

至于标签页面中的显示形式，我们在后台只要将每个一级标签作为Map数据结构中的键，当前一级标签所拥有的二级标签作为对应的值，然后将Map作为model返回给视图进行解析渲染即可。

代码实现如下：

```
/**
 * @Author: spider_hgyi
 * @Date: Created in 下午1:36 17-11-20.
 * @Modified By:
 * @Description:
 */
@Controller
@RequestMapping("/auth")
public class TagsController {
    ... ...

    @RequestMapping(value = "/tags", method = RequestMethod.GET)
    public String showLabel(Model model) {
	    // 得到所有的一级标签（parent_id == 0）
        List<BookLabelPO> parentLabels = bookLabelRepository.getBookLabelByParentId(0);
        // 得到所有的二级标签（parent_id != 0）
        List<BookLabelPO> childrenLabels = bookLabelRepository.getChildrenLabelsByParentId(0);
        // 返回给视图的model
        Map<String, Map<Integer, String>> labelsName = new HashMap<String, Map<Integer, String>>();

        // 找到每个一级标签所拥有的二级标签
        for (BookLabelPO parentLabel : parentLabels) {
            Map<Integer, String> childLabelsName = new HashMap<Integer, String>();
            for (BookLabelPO childrenLabel : childrenLabels) {
                if (parentLabel.getPkId() == childrenLabel.getParentId()) {
                    childLabelsName.put(childrenLabel.getPkId(), childrenLabel.getName());
                }
            }
            labelsName.put(parentLabel.getName(), childLabelsName);
        }

        // 将存储标签信息的Map对象添加进model对象
        model.addAttribute("labelsName", labelsName);

        return "alltags";
    }
}
```

### **模块三：上传书籍模块**
#### **腾讯云存储服务---图片存储**

由于有些书籍会上传封面照片，而腾讯云又提供了对象存储服务，因此我并没有选择将图片存储至本地或云服务器上，而是使用了腾讯云所提供的云对象存储。

使用云对象存储，腾讯所提供的开发者文档：**[对象存储 --- SDK 文档](https://cloud.tencent.com/document/product/436/10199)**

#### **手动获取bean**

Spring MVC给我们提供了文件上传功能（两种使用形式）：

> 1. 给控制器方法参数上添加@RequestPart注解，参数类型为字节数组
> 2. 给控制器方法参数上添加@RequestPart注解，参数类型为Part

但是我在使用Spring MVC所提供的文件上传功能时，始终无法获取到对应的字节流对象。我查阅了大量的相关文档，并仔细的检查了所写的代码，最终也没有找到问题的根源。因此在项目中，对于书籍图片的处理，我使用了Servlet所提供的原生API：`request.getPart()`。

既然使用了Servlet所提供的原生API，因此图书上传模块所对应的控制器便继承于HttpServlet。在继承了HttpServlet之后，还是出现了很多问题---怎么使原生Servlet与Spring MVC的bean之间进行协作？

在使用了HttpServlet之后，便无法给此Servlet添加@controller注解，也就无法使用依赖注入。大概的原因是Servlet由Web容器管理，而bean由Spring容器管理。在这种情况下，我对bean进行了手动获取。

手动获取bean的代码我写到了Servlet的init方法中，对于此方法我不在这里进行描述。

博主之所以将这一技术细节提取出来，也是想给那些遇到同样问题的朋友们提供一些思路。

代码实现如下：

```java
/**
 * @Author: spider_hgyi
 * @Date: Created in 下午8:14 17-12-3.
 * @Modified By:
 * @Description:
 */
@WebServlet(urlPatterns = "/auth/upload.do")
@MultipartConfig
public class NewBookController extends HttpServlet {
    private static final Logger logger = LoggerFactory.getLogger(NewBookController.class);

    private BookInfoService bookInfoService;
    private BookLabelService bookLabelService;
    private BookRelationLabelService bookRelationLabelService;
    private COSStorage cosStorage;

    // 手动获取bean
    public void init() throws ServletException {
        // 得到Servlet应用上下文
        ServletContext servletContext = this.getServletContext();
        // 得到Web应用上下文
        WebApplicationContext ctx = WebApplicationContextUtils.getWebApplicationContext(servletContext);
        // 根据beanId获取相应bean
        bookInfoService = (BookInfoService) ctx.getBean("bookInfoServiceImpl");
        bookLabelService = (BookLabelService) ctx.getBean("bookLabelServiceImpl");
        bookRelationLabelService = (BookRelationLabelService) ctx.getBean("bookRelationLabelServiceImpl");
        cosStorage = (COSStorage) ctx.getBean("cosStorage");
    }

    ... ...
}
```

### **模块四：对Jdbc RowMapper的简易封装**

本项目的架构采用`Spring + Spring MVC + JdbcTemplate`，其中Spring + Spring MVC对应ssm框架中的ss，我们并没有使用Mybatis框架。Spring提供了相应的JDBC框架---JdbcTemplate。

对于JdbcTemplate的使用如下（在使用之前需要进行相关的Spring配置）：

```java
/**
 * Created by hg_yi on 17-11-7.
 */
@Repository
public class JdbcSpitterRepository implements SpitterRepository {
    JdbcOperations jdbcOperations;
    
    private final static String INSERT_SPITTER = "INSERT INTO spitter (username, password, " +
            "firstname, lastname) VALUES (?, ?, ?, ?)";
    private final static String QUERY_SPITTER_BY_USERNAME = "SELECT * FROM spitter " +
            "WHERE username = ?";

    @Inject
    public JdbcSpitterRepository(JdbcOperations jdbcOperations) {
        this.jdbcOperations = jdbcOperations;
    }

    // 数据库插入操作
    public Spitter save(Spitter spitter) {
        jdbcOperations.update(INSERT_SPITTER, spitter.getUsername(), spitter.getPassword(),
                spitter.getFirstName(), spitter.getLastName());

        return spitter;
    }

    // 数据库查询操作
    public List<Spitter> findByUsername(String username) {
        return jdbcOperations.query(QUERY_SPITTER_BY_USERNAME,
                new SpitterRowMapper(), username);
    }

    private final static class SpitterRowMapper implements RowMapper<Spitter> {
        public Spitter mapRow(ResultSet resultSet, int rowNum) throws SQLException {
            return new Spitter(
                    resultSet.getInt("id"),
                    resultSet.getString("username"),
                    resultSet.getString("password"),
                    resultSet.getString("firstname"),
                    resultSet.getString("lastname")
            );
        }
    }
}
```

对上述代码有几点说明：

> 1. JdbcOperations是一个接口，定义了JdbcTemplate所实现的操作。通过注入JdbcOperations从而使JdbcSpitterRepository与JdbcTemplate保持了松耦合
> 2. 使用RowMapper对Spitter对象进行填充，最后得到从数据库中查询到的结果集合
> 3. 使用JdbcTemplate极大的方便了对JDBC的操作，没有了创建JDBC连接和语句的代码，也没有了异常处理的代码，只剩下单纯的数据插入与查询代码

- **那么我们为何还要对RowMapper进行封装？**

由上面的代码可知，每当我们从相同（不同）的数据库表中得到不同的数据时，就有可能创建不同的RowMapper。那么问题就凸显出来了，我们的系统中必定有多张数据库表，也必定要从各个表中查询不同的数据，那么就会创建大量不同的RowMapper类，这些RowMapper散落于项目中的各个角落。这样的设计，显然很失败。

- **我们自己封装的JdbcRowMapper（与Spring所提供的RowMapper所区分）有什么功能呢？**

我们尝试对RowMapper进行封装，以提供这样的功能：对于不同的对象，RowMapper在从数据库中查询到相应的数据之后，都可对其相应的字段进行自动填充。

**我们先来看一下它的使用效果：**

```
jdbcOperations.query(GET_BOOK_BY_LABEL_AND_PAGE_TYPESCONTROLLER,
                        JdbcRowMapper.newInstance(BookInfoPO.class), labelId,pagePO.getBeginIndex(), pagePO.getEveryPage());
                        
jdbcOperations.query(QUERY_CHILDREN_LABELS_BY_PARENT_ID, JdbcRowMapper.newInstance(BookLabelPO.class), parentId);
```

可以看到，我们不必再为不同的PO对象编写不同的RowMapper。

现在开始分析它的具体实现：

根据上述代码，我们先来分析它的`newInstance`方法：

```java
public static <T> JdbcRowMapper<T> newInstance (Class<T> mappedClass) {
    return new JdbcRowMapper<T>(mappedClass);
}
```

这是一个泛型方法，返回值是泛型类：`JdbcRowMapper<T>`，方法参数是泛型Class对象。这个方法调用了JdbcRowMapper如下的构造方法：

```java
public JdbcRowMapper(Class<T> mappedClass) {
    initialize(mappedClass);
}
```

继续跟踪，initialize方法：（核心方法之一）

- **initialize方法的作用：**

> - 在说initialize方法的作用之前，我们先要知道什么是PO。之前我所使用的Java Bean为什么都以PO为后缀？简单来说，这是Java Bean与持久化层之间的一层规约。这层规约可以简单的概述为：数据库中表字段的命名方式都以下划线分割单词，而Java Bean中则是以驼峰式命名，并且，每个PO对象基本对应一张数据库表。就拿BookInfoPO中的`private int pkId`属性来说，它对应的就是数据库表`book_info`中的`pk_id`字段。这里涉及到了数据库建表时的规范，我们之后再说。目前你就先这样记住。
> - 有了这层规约，我们在封装RowMapper的时候，就可以通过一些逻辑代码，将Java Bean中的实例字段名转换为数据库表中相应的字段名，也就为我们的下一个方法：把从数据库表中读取到的数据填充到Java Bean中的相应字段做了铺垫。


- **initialize方法的实现思路：**

> 1. 通过`BeanUtils.getPropertyDescriptor()`得到当前JavaBean(mappedClass对应的PO)的PropertyDescriptor数组
> 2. 对PropertyDescriptor数组进行遍历，拿到每一个实例变量的变量名
> 3. 对变量名做相应转换，转为对应的数据库表字段名
> 4. 将这些名字保存在合适的数据结构中，供接下来的mapRow方法使用（JdbcRowMapper中真正从数据库中读取所需数据的方法）

有了实现思路，那么接下来看代码实现：

```java
protected void initialize(Class<T> mappedClass) {
    // 以下三个变量都是实例变量，在这里进行初始化
    this.mappedClass = mappedClass;
    this.mappedFileds = new HashMap<String, PropertyDescriptor>();
    this.mappedProperties = new HashSet<String>();

    /** 
     * 通过BeanUtils.getPropertyDescriptor()得到当前JavaBean(mappedClass对应的PO)的PropertyDescriptor数组，PropertyDescriptors类是Java内省类库的一个类。
     * Java JDK中提供了一套API用来访问某个对象属性的getter/setter方法，这就是内省。
     */
    
    // 获取bean的所有属性（也就是实例变量）列表   
    PropertyDescriptor[] propertyDescriptors = BeanUtils.getPropertyDescriptors(mappedClass);

    // 遍历属性列表
    for (PropertyDescriptor propertyDescriptor : propertyDescriptors) {
        // propertyDescriptor.getWriteMethod()获得用于写入属性值的方法
        if (propertyDescriptor.getWriteMethod() != null) {
            // 得到此属性名（变量名）
            String name = propertyDescriptor.getName();
            
            try {
                // 通过反射取得Class里名为name的字段信息
                Field field = mappedClass.getDeclaredField(name);
                if (field != null) {
                    // 得到该属性(field)上存在的注解值（下一个代码给出示例）
                    Column column = field.getAnnotation(Column.class);

                    // 如果取得的column值不为null, 那就给name赋值column.name
                    if (column != null) {
                        name = column.name();
                    }
                }
            } catch (NoSuchFieldException e) {
                e.printStackTrace();
            }

            // 将<属性名字, 属性>加入mappedFileds中
            this.mappedFileds.put(lowerCaseName(name), propertyDescriptor);

            // 不使用自定义注解，使用代码将所得name转换为对应数据库表字段
            String underscoredName = underscoreName(name);
            
            // 如果两个不等，则将nderscoredName也添加进mappedFileds，相当于一种容错机制
            if (!lowerCaseName(name).equals(underscoredName)) {
                this.mappedFileds.put(underscoredName, propertyDescriptor);
            }
            
            // 将属性名添加至mappedProperties
            this.mappedProperties.add(name);
        }
    }
}
```

这就是initialize方法。接下来看一下其中所用到的自定义注解，也就是对这一行代码的解释：`Column column = field.getAnnotation(Column.class)`

- **定义自定义注解：**
```java
/**
 * @Author: dela
 * @Date: 
 * @Modified By:
 * @Description: @Retention是JDK的元注解, 当RetentionPolicy取值为RUNTIME的时候,
 * 意味着编译器将Annotation记录在class文件中, 当Java文件运行的时候,
 * JVM也可以获取Annotation的信息, 程序可以通过反射获取该Annotation的信息.
 */
 
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
// @Target也是JDK的一个元注解, 当ElementType取不同值的时候, 意味着这个注解的作用域也不同,
// 比如, 当ElementType取TYPE的时候, 说明这个注解用于类/接口/枚举定义

public @interface Table {
    // 数据库中表的名字
    String name();
}
```

```java
/**
 * Created by dela on 12/20/17.
 */

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface Column {
    // 数据库中的表上的字段的名字
    String name();
}
```

- **自定义注解在BookInfoPO中的应用：**

```java
/**
 * Created by dela on 11/22/17.
 */

// 书籍信息表
@Table(name = "book_info")
public class BookInfoPO implements Comparable<BookInfoPO> {
    @Column(name = "pk_id")
    private int pkId;                   // 无意义主键
    @Column(name = "ugk_name")
    private String ugkName;             // 书名(组合索引)
    @Column(name = "author")
    private String author;              // 作者
    @Column(name = "ugk_uid")
    private int ugkUid;                 // 所有者(即用户表里的id)(组合索引)
    @Column(name = "amount")
    private int amount;                 // 数量
    @Column(name = "upload_date")
    private String uploadDate;          // 上传时间
    @Column(name = "book_picture")
    private String bookPicture;         // 书籍照片
    @Column(name = "describ")
    private String describ;             // 书籍描述

    public BookInfoPO() { }

    ... ...
}
```

- 在initialize方法中还有一个`underscoreName()`：（此方法就不打注解了）

```java
protected String underscoreName(String name) {
    if (!StringUtils.hasLength(name)) {
        return "";
    }

    StringBuilder result = new StringBuilder();
    result.append(lowerCaseName(name.substring(0, 1)));
    for (int i = 1; i < name.length(); i++) {
        String s = name.substring(i, i + 1);
        String slc = lowerCaseName(s);
        
        if (!s.equals(slc)) {
            result.append("_").append(slc);
        } else {
            result.append(s);
        }
    }
    
    return result.toString();
}
```

Ok，接下来我们继续探究核心方法二：`mapRow()`

刚说过initialize方法是为了使mapRow方法可以把从数据库表中读取到的结果填充到Java Bean相应的字段上而做的一个铺垫。那么mapRow必定实现了如下功能：

> 1. 从数据库表中读取结果集
> 2. 将结果集中的元素填充到相应的Java Bean中（别忘了initialize方法已经帮我们将Java Bean中的实例变量名转换为了数据库表中相应的字段名）

明白了mapRow中实现的大致功能，那么我们直接来看源码：

```java
public T mapRow(ResultSet resultSet, int rowNumber) throws SQLException {
    // Spring的断言表达式, 传入的Java Bean的Class对象不能为空
    Assert.state(this.mappedClass != null, "Mapped class was not specified");
        // 实例化一个Java Bean
        T mappedObject = BeanUtils.instantiate(this.mappedClass);

        // BeanWrapper可以设置及访问被包装对象的属性值
        BeanWrapper beanWrapper = PropertyAccessorFactory.forBeanPropertyAccess(mappedObject);

        // 从resultSet中拿到有关此数据库表的元数据（字段名称、类型以及数目等）
        ResultSetMetaData resultSetMetaData = resultSet.getMetaData();
        // 得到此数据库表的字段数目
        int columnCount = resultSetMetaData.getColumnCount();

        for (int index = 1; index <= columnCount; index++) {
            // 得到数据库表中当前字段名
            String column = JdbcUtils.lookupColumnName(resultSetMetaData, index);
            String field = lowerCaseName(column.replaceAll(" ", ""));

            // 根据数据库表中的字段名拿到Java Bean中对应实例字段属性的描述
            PropertyDescriptor propertyDescriptor = this.mappedFileds.get(field);
            if (propertyDescriptor != null) {
                try {
                    // 得到该field所对应的数据库表中字段所对应的值（下一个代码给出示例）
                    Object value = getColumnValue(resultSet, index, propertyDescriptor);

                    ... ...

                    try {
                        // 将得到值填充到Java Bean中相应的实例变量上
                        beanWrapper.setPropertyValue(propertyDescriptor.getName(), value);
                    } catch (TypeMismatchException ex) {
                        ... ...
                    }
                } catch (NotWritablePropertyException ex) {
                    ... ...
                }
            } else {
                // 没有发现相应实例字段的属性描述
                ... ...
            }
        }

        return mappedObject;
    }
```

getColumnValue()的源码如下：
```java
// 得到数据库表中字段(column)对应的值(value)
protected Object getColumnValue(ResultSet resultSet, int index, PropertyDescriptor propertyDescriptor) throws SQLException {
    return JdbcUtils.getResultSetValue(resultSet, index, propertyDescriptor.getPropertyType());
}
```


----------
## **设计数据库**

由于博主负责了本项目的数据库设计，因此在这里有一点心得想分享给大家。

首先是MySQL的建表规范（当然并不绝对）：

> - 主键一律无意义，就算有意义，也必须是以后不会被更新，修改并且是自增的字段。命名规范一律是pk_id,数据类型为int unsigned,字段not null。
> - 唯一索引命名一律以uk_为前缀，唯一索引并不以提高查询速率为主要目的，主要是进行唯一性约束。
> - 唯一组合索引命名一律以ugk_为前缀，目的同上，注意最左前缀的问题。
由于主键一律设置的是无意义的自增字段，所以对于有外键约束的字段，只设置了级联删除（只更新父表的主键会存在外键约束）。
> - 日期字段的数据类型一律为datetime。
> - 所有表的字段设置为not null，数字默认值为0,字符串默认值为''，datetime没有设置默认值，因此在后台必须处理时间问题。

当初在设计本项目的数据库时分别使用了主键与外键约束、唯一索引与组合索引、级联更新与级联删除等技术。对于这些技术的讲解在博主所置顶的几篇博客中就可以看到，因此不再讲解。

至于数据库结构与数据的SQL文件，在本人GitHub的README中有提供，感兴趣的可以去下载，源码地址在本篇博客开始已经给出～

Ok，XiyouLinux Group图书借阅平台的实现分析至此结束！