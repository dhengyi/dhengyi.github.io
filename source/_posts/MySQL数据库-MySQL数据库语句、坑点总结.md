---
title: MySQL数据库--MySQL数据库语句、坑点总结
date: 2017-04-14 18:04:23
tags:
    - 数据库
categories: MySQL数据库
---

## **MySQL实用语句操作**

1.清空数据库表的同时将id的增长顺序重新设为从0开始：

```sql
TRUNCATE TABLE 数据库表名
```

2.在知道数据库原密码的时候进行修改密码：

```sql
mysqladmin -u root -p password "new password"
```

3.将选定数据库导出至sql脚本：（只导出表结构）：

```sql
mysqldump -u root -p -d "数据库名" > "sql脚本"
```

4.将选定数据库导出至sql脚本（表结构和数据全部导出）：

```sql
mysqldump -u root -p "数据库名" > "sql脚本"
```

5.将mysql脚本导入至数据库：

```sql
mysql -u root -p "数据库名" < "sql脚本"
```

6.查看字段编码：

```sql
SHOW FULL COLUMNS FROM <表名>
```

7.查看表编码：

```sql
SHOW CREATE TABLE <表名>
```


----------
## **解决中文乱码**

原文链接：[整理 ： 查看和修改 mysql库、表、字段编码](http://blog.csdn.net/springsunss/article/details/70337915)

文中好像有些许错误... ...


----------
## **忘记数据库密码，我们应该怎么办？**

此方法在Centos7下进行了有效测试：

1.编辑/etc/my.cnf实现免密登录，确保你的数据库不会被其他人进行恶意修改。
找到 **[mysqld]** 段，并给段中任意地方加上一句：**skip-grant-tables**：

```sql
skip-grant-tables
```

2.重启mysql服务：

```sql
systemctl restart mysql.service
```

3.在数据库中修改密码：

```sql
use mysql;
UPDATE user SET Password = password('new password') WHERE User = 'root';
flush privileges;
```

4.最后将免密功能再去掉，就可以了。


----------
## **Unknown column 'xxx' in 'where clause'**

列名不存在的结论，但是，很多时候起始并不是由于列名出错造成的。而是由于拼凑sql语句时对字符类型数据没有用引号引起来造成的。

这个错误我改了三个小时，做了无数测试，一度以为是玄学，来一看一下正确的写法吧，还有这个错误在要拼接的SQL语句是int型的时候，一般是不会出现的... ....

```sql
statement = connection.prepareStatement(
				"SELECT * FROM book_class WHERE name = '" + labelName + "'");
```


----------
## **避免使用IN或者OR**

(OR会导致扫表)，使用UNION ALL：

```sql
(select * from article where article_category=2) UNION ALL (select * from article where article_category=3) ORDER BY article_id desc limit 5
```

**UNION 和UNION ALL 的区别：**在数据库中，UNION和UNION ALL关键字都是将两个结果集合并为一个，但这两者从使用和效率上来说都有所不同。UNION在进行表链接后会筛选掉重复的记录，所以在表链接后会对所产生的结果集进行排序运算，删除重复的记录再返回结果。

从效率上说，UNION ALL 要比UNION快很多，所以，如果可以确认合并的两个结果集中不包含重复的数据的话，那么就使用UNION ALL。


----------
## **创建索引**

执行一个很普通的查询：

```sql
SELECT * FROM `article` WHERE article_category=11 ORDER BY article_id DESC LIMIT 5
```

执行时间大约要5秒左右。

建一个索引（组合索引）：

```sql
CREATE INDEX idx_u ON article(article_category, article_id);
```

```sql
SELECT * FROM `article` WHERE article_category=11 ORDER BY article_id DESC LIMIT 5
```

减少到0.0027秒。


----------
## **排序数据**

排序：

```sql
// 升序（默认）
SELECT * FROM 表名 ORDER BY 字段 ASC;

// 降序
SELECT * FROM 表名 ORDER BY 字段 DESC;

// 多个列排序
SELECT 字段1，字段2，字段3 FROM 表名 ORDER BY 字段1 DESC，字段2;
```

注意：用非检索的列排数据是完全合法的。首先按字段1进行排序。


----------
## **过滤数据**

不匹配检查：

```sql
// 不返回字段1的值为1003的行（一般使用!=）
SELECT 字段1，字段2 FROM 表名 WHERE 字段1 <> 1003;
```

范围值检查：

```sql
SELECT * FROM 表名 WHERE 字段 BETWEEN 5 AND 10;
```

注意：SQL在处理OR操作符前，优先处理AND操作符。解决方式像其他语言一样使用括号。

```sql
// IN的功能和OR的完全一样，推荐使用IN，执行更快，更直观，可包含其他SELECT语句
SELECT 字段 FROM 表名 WHERE 字段 IN (1002，1003) ORDER BY 字段;
```

通配符：

```sql
// %表示任何字符出现任意次数（包括0）（所有以jet开头的单词）
SELECT 字段1，字段2 FROM 表名 WHERE 字段 LIKE 'jet%';
```

注意：使用通配符需要在意尾空格。还有一个通配符_只匹配单个字符而不是多个字符。（不要过度使用通配符，时间代价比其它操作符更高，但它的确很有用）

注意：

> 1. 其中like要求整个数据都要匹配，而REGEXP只需要部分匹配即可。
> 2. 匹配特殊字符使用\\\为前导
> 3. 如果需要匹配反斜杠（\）字符本身，需要使用\\\\\


----------
## **计算字段**

拼接（Concat函数）：

```sql
SELECT Concat(字段1，字段2，... ...) FROM 表名;
```

删除右侧多余空格（RTrim函数）（LTrim，Trim）：

```sql
SELECT Concat(RTrim(字段1)，RTrim(字段2)) FROM 表名;
```

使用别名：

```sql
SELECT Concat(RTrim(字段1), RTrim(字段2)) AS 别名 FROM 表名;
```

执行算术计算：

```sql
SELECT 字段1，字段2，字段1*字段2 AS 字段名 FROM 表名; 
```


----------
## **数据处理函数**

```sql
SELECT 字段，Upper(字段) AS 字段 FROM 表名;
```

文本处理函数：

函数 | 说明
---|---
Length() | 返回串左边长度
Lower() | 将串转换为小写
Soundex() | 返回串的SOUNDEX值（建议百度）
Upper() | 将串转换为大写

日期时间处理函数：

```sql
// 只比较日期
SELECT 字段 FROM 表名 WHERE Date(字段) = 'YYYY-MM-DD';

// 只比较时间
SELECT 字段 FROM 表名 WHERE Time(字段) = 'hh-mm-ss';
```

函数 | 说明
---|---
CurDate() | 返回当前日期
CurTime() | 返回当前时间
Date() | 返回日期时间的日期部分（推荐使用）
DateDiff() | 计算两个日期之差
Date_Format() | 返回一个格式化的日期或时间串
Now() | 返回当前日期和时间
Time() | 返回一个日期时间的时间部分（推荐使用）


----------
## **汇总数据**

聚集函数：

```sql
SELECT AVG(字段) AS 字段 FROM 表名;

// DISTINCT用来聚集不同的值（MySQL 4.x不能使用）
SELECT AVG(DISTINCT 字段) AS 字段 FROM 表名;

SELECT COUNT(*) AS 字段，MIN(字段) AS 字段，MAX(字段) AS 字段，AVG(字段) AS 字段 FROM 表名;
```

函数 | 说明
---|---
AVG() | 返回某列平均值
COUNT() | 返回某列行数（注意COUNT(*)与COUNT(column)）
MAX() | 返回某列最大值 (可应用于日期与文本数据)
MIN() | 返回某列最小值
SUM() | 返回某列之和


----------
## **分组数据**

```sql
SELECT 字段1，COUNT(*) AS 字段 FROM 表名 GROUP BY 字段1;
```

过滤分组：

```sql
SELECT 字段1，COUNT(*) AS 字段 FROM 表名 GROUP BY 字段1 HAVING COUNT(*) >= 2;

//HAVING与WHERE
SELECT 字段1，COUNT(*) AS 字段 FROM 表名 WHERE 字段 >= 10 GROUP BY 字段1 HAVING COUNT(*) >= 2;
```

SELECT 子句顺序：

子句 | 是否必须使用
---|---
SELECT | 是
FROM | 否
WHERE | 否
GROUP BY | 否
HAVING | 否
ORDER BY | 否
LIMIT | 否


----------
## **子查询**

```sql
SELECT 字段1 FROM 表名1 WHERE 字段2 IN (SELECT 字段3 
	FROM 表名2 WHERE 字段4 = 字符串);

SELECT 字段1, (SELECT COUNT(*) FROM 表名1 WHERE 字段2 = 字段3) AS 字段 FROM 表名2;
```


----------
## **联结**

创建联结：

```sql
select vend_name, prod_name, prod_price(指定列) from vendors, products(关系表) where vendors.vend_id = products.vend_id order by vend_name, pro_prod_name;
```

```sql
select vend_name, prod_name, prod_price(指定列) from vendors inner join products on vendors.vend_id = products.vend_id;
```

建议使用第二个语法。

笛卡尔积（叉联结）：

```sql
select vend_name, prod_name, prod_price(指定列) from vendors, products(关系表) order by vend_name, pro_prod_name;
```

由没有联结条件的表关系返回的结果为笛卡尔积。**检索出的行的数目将是第一个表的行数乘以第二个表中的行数。**

联结多个表：

```sql
SELECT prod_name, vend_name, prod_price, quantity FROM orderitems, products, vendors WHERE prodicts.vend_id = vendors.vend_id AND orderitems.prod_id = products.prod_id AND order_num = 20005;
```


----------
## **高级联结**

表别名：

```sql
SELECT cust_name, cust_contact FROM customers AS c, orders AS o, orderitems AS oi WHERE c.cust_id = o.cust_id AND oi.order_num = o.order_num AND prod_id = 'TNT2';
```

自联结：

```sql
// 我觉得使用SELECT子查询也许更简单
SELECT p1.prod_id, p1.prod_name FROM products AS p1, products AS p2 WHERE p1.vend_id = p2.vend_id AND WHERE p2.prod_id = 'DTNTR';

```

自然联结：（常用，重点，基本上每个内部联结都是自然联结）

```sql
SELECT c.*, o.order_num, o.order_date, oi.prod_id, o.quantity, oi.item_price FROM customers AS c, orders AS o, orderitems AS oi WHERE c.cust_id = o.cust_id AND oi.order_num = o.order_num AND prod_id = 'FB';
```

外部联结：

```sql
select customers.cust_id, orders.order_num from customers left outer join oders on customers.cust_id = orders.cust_id;
```

带聚集的联结：

```sql
SELECT customers.cust_name, customers.cust_id, COUNT(orders.order_num) AS num_ord FROM customers INNER JOIN orders ON customers.cust_id = orders.cust_id GROUP BY customers.cust_id;
```


----------
## **插入检索出的数据**

INSERT SELECT 语句：

```sql
INSERT INTO 表名1(cust_id, cust_concact, cust_email, cust_name) SELECT cust_id, cust_concact, cust_email, cust_name FROM 表名2;
```


----------
## **全文本搜索**

```sql
SELECT 字段 FROM 表名 WHERE Match(字段) Against(搜索文本); 
```

布尔文本搜索：

```sql
SELECT 字段 FROM 表名 WHERE Match(字段) Against('+rabbit +fat' IN BOOLEAN MODE); 
```

说明：返回的行必须同时包含关键字 rabbit 和 fat。

```sql
SELECT 字段 FROM 表名  WHERE Match(字段) Against('rabbit good' IN BOOLEAN MODE); 
```

说明：没有指定操作符，搜索包含rabbit或good的行（其中的一个或两个）。

```sql
SELECT 字段 FROM 表名 WHERE Match(字段) Against('+fat +(>rabbit)' IN BOOLEAN MODE); 
```

说明：文本包含fat和rabbit的行，且增加后者的优先级值。

布尔操作符 | 描述
---|---
+ | 包含指定值 
- | 排除指定值 
> | 包含指定值,并且增加优先级值 
< | 包含指定值,并且减少优先级值 


----------
## **存储过程**

执行存储过程：

```sql
CALL 存储过程名(@参数1，@参数2，@参数3);
```

创建存储过程：

```sql
CREATE PROCEDURE 存储过程名()
BEGIN
    SELECT AVG(字段) AS 字段 FROM 表名;
END;
```

删除存储过程：

```sql
DROP PROCEDURE 存储过程名;
```

使用参数：

```sql
CREATE PROCEDURE ordertotal(IN onumber INT, OUT ototal DECIMAL(8,2))

BEGIN
	SELECT SUM(字段1*字段2) FROM 表名 WHERE order_num = onumber INTO ototal;
END;

CALL ordertotal(20005, @total);

SELECT @total;
```

说明：创建存储过程PROCEDURE，传入onumber，存储变量为ototal，WHERE子句中使用onumber，将查询结果存储在ototal。


----------
## **触发器**

建立触发器：

```sql
CREATE TRIGGER 触发器名 AFTER INSERT ON 表名 FOR EACH ROW SELECT '字符串';
```

说明：FOR EACH ROW 表明代码对每个插入行执行。

删除触发器：

```sql
DROP TRIGGER 触发器名;
```

INSERT触发器：

```sql
CREATE TRIGGER 触发器名 AFTER INSERT ON 表名 FOR EACH ROW SELECT NEW.字段;
```

说明：每向表中插入一条数据之后，就返回最新插入数据中的字段值。

DELETE 触发器：

```sql
CREATE TRIGGER 触发器名 BEFORE DELETE ON 表名 FOR EACH ROW BEGIN 
			INSERT INTO 表名(字段1， 字段2) VALUES (字段值1， 字段值2); END;
```

UPDATE触发器：

```sql
CREATE TRIGGER 触发器名 BRFORE UPDATE ON 表名 FOR EACH ROW SET NEW.字段 = Upper(NEW.字段);
```


----------
## **事务处理**

事务开始：

```sql
START TRANSACTION;
```

```sql
SELECT * FROM ordertotals;
START TRANSACTION;
DELETE FROM ordertotals;
SELECT * FROM ordertotals;
ROLLBACK;
SELECT * FROM ordertotals;
```

说明：ROLLBACK 回退START TRANSACTION 之后的所有语句。CREATE和DROP操作不能回退。

使用COMMIT：

```sql
START TRANSACTION;
DELETE FROM orderitems WHERE order_num = 20010;
DELETE FROM orders WHERE order_num = 20010;
COMMIT;
```

使用保留点：

```sql
SAVEPOINT 保留点名称1;
ROLLBACK TO 保留点名称1;
```


----------
## **管理用户**

创建用户帐号：

```sql
CREATE USER 用户名 IDENTIFIED BY '密码';
```

删除用户帐号：

```sql
DROP USER 用户名;
```

授予权限：

```sql
GRANT SELECT ON crashcourse.* TO 用户名;
```

说明：此GRANT 允许用户在crashcourse数据库的所有表上使用SELECT权限。

查看用户权限：

```sql
SHOW GRANTS FOR 用户名;
```

撤销用户权限：

```sql
REVOKE SELECT ON crashcourse.* FROM 用户名;
```

说明：撤销用户在crashcourse数据库所有表上的读权限。

更改口令：

```sql
SET PASSWORD FOR 用户 = PASSWORD('new password');
```