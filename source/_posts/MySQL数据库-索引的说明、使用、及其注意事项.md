---
title: MySQL数据库--索引的说明、使用、及其注意事项
date: 2017-11-16 16:44:37
tags:
    - 数据库
    - 索引
categories: MySQL数据库
---

## **什么是索引**

索引用来快速地寻找那些具有特定值的记录，所有MySQL索引都以B-树的形式保存。如果没有索引，执行查询时MySQL必须从第一个记录开始扫描整个表的所有记录，直至找到符合要求的记录。表里面的记录数量越多，这个操作的代价就越高。如果作为搜索条件的列上已经创建了索引，MySQL无需扫描任何记录即可迅速得到目标记录所在的位置。如果表有1000个记录，通过索引查找记录至少要比顺序扫描记录快100倍。

假设我们创建了一个名为people的表：

```sql
CREATE TABLE people (peopleid SMALLINT NOT NULL, name CHAR(50) NOT NULL);
```

然后，我们完全随机把1000个不同name值插入到people表。

如果我们创建了name列的索引，MySQL将在索引中排序name列。

对于索引中的每一项，MySQL在内部为它保存一个数据文件中实际记录所在位置的“指针”。因此，如果我们要查找name等于“Mike”记录的peopleid（SQL命令为“SELECT peopleid FROM people WHERE name='Mike';”），MySQL能够在name的索引中查找“Mike”值，然后通过指针直接转到数据文件中相应的行，准确地返回该行的peopleid（999）。在这个过程中，MySQL只需处理一个行就可以返回结果。如果没有“name”列的索引，MySQL要扫描数据文件中的所有记录，即1000个记录！显然，需要MySQL处理的记录数量越少，则它完成任务的速度就越快。


----------
## **索引的类型及使用**
### **普通索引**

普通索引可以通过以下几种方式创建：

```sql
创建索引：CREATE INDEX <indexname> ON <tablename>(列);

修改表：ALTER TABLE <tablename> ADD INDEX <indexname>(列);

创建表的时候指定索引：CREATE TABLE <tablename>([...], INDEX <indexname>(列));
```

### **唯一性索引**

这种索引和前面的“普通索引”基本相同，但有一个区别：索引列的所有值都只能出现一次，即必须唯一。唯一性索引可以用以下几种方式创建：

```sql
创建索引：CREATE UNIQUE INDEX <indexname> ON tablename(列);

修改表：例如ALTER TABLE <tablename> ADD UNIQUE <indexname>(列);

创建表的时候指定索引：CREATE TABLE <tablename> ([...], UNIQUE <indexname>(列));
```

### **主键索引**

它是一种特殊的唯一索引，不允许有空值。一般是在建表的时候同时创建主键索引：

```sql
创建表的时候指定索引：CREATE TABLE <tablename>([...], PRIMARY KEY(列)); 

修改表：ALTER TABLE <tablename> ADD PRIMARY KEY(列);
```

### **组合索引**

为了形象地对比单列索引和组合索引，建立一个拥有多个字段的表：

```sql
CREATE TABLE <tablename>(id INT NOT NULL, username VARCHAR(16) NOT NULL, city VARCHAR(50) NOT NULL, age INT NOT NULL); 
```

为了进一步榨取MySQL的效率，就要考虑建立组合索引。就是将 name, city, age建到一个索引里：

```sql
ALTER TABLE <tablename> ADD INDEX <indexname>(username(10), city, age);
```

那么，如果在username、city、age这三个列上分别创建单列索引，效果是否和创建一个username、city、age的多列索引一样呢？答案是否定的，两者完全不同。当我们执行查询的时候，MySQL只能使用一个索引。如果你有三个单列的索引，MySQL会试图选择一个限制最严格的索引。但是，即使是限制最严格的单列索引，它的限制能力也肯定远远低于firstname、lastname、age这三个列上的多列索引。

建立这样的组合索引，其实是相当于分别建立了下面三组组合索引：

```
usernname, city, age
usernname, city
usernname
```

为什么没有city，age这样的组合索引呢？这是因为MySQL组合索引“最左前缀”的结果。下面我们来了解一下最左前缀。

### **最左前缀**

多列索引还有另外一个优点，它通过称为最左前缀（Leftmost Prefixing）的概念体现出来。继续考虑前面的例子，现在我们有一个username、city、age列上的多列索引，我们称这个索引为uname_city_age。当搜索条件是以下各种列的组合时，MySQL将使用uname_city_age索引：

```
username，city，age
username，city
username
```

从另一方面理解，它相当于我们创建了(username，city，age)、(username，city)以及(username)这些列组合上的索引。下面这些查询都能够使用这个uname_city_age索引：

```sql
SELECT id FROM <tablename> WHERE username='Mike' AND city='xian' AND age='17';
SELECT id FROM <tablename> WHERE username='Mike' AND city='xian';
SELECT id FROM <tablename> WHERE username='Mike';
```

相反的，其他的查询则不能使用索引。


----------
## **什么时候不应建立索引**

虽然使用索引可以提高查询速度，但它使用了额外的空间换取了查询的时间，并且如果滥用索引的话，不仅不会提高数据库的性能，反而会增大插入、更新数据的难度，从而拖累数据库的性能。因此使用索引时，以下情况可以不用建立索引：

> 1. 表记录太少。
> 2. 经常插入、删除、修改的表，对一些经常处理的业务表应在查询允许的情况下尽量减少索引。
> 3. 数据重复且分布平均的表字段，假如一个表有10万行记录，有一个字段A只有T和F两种值，且每个值的分布概率大约为50%，那么对这种表A字段建索引一般不会提高数据库的查询速度。


----------
## **创建索引时应注意的问题**

> 1. 索引不会包含有NULL值的列，只要列中包含有NULL值都将不会被包含在索引中，复合索引中只要有一列含有NULL值，那么这一列对于此复合索引就是无效的。所以我们在数据库设计时不要让字段的默认值为NULL。
> 2. 不要过度索引，不是什么情况都非得建索引不可，比如性别可能就只有两个值，建索引不仅没什么优势，还会影响到更新速度，这被称为过度索引。
> 3. 使用短索引，对串列进行索引，如果可能应该指定一个前缀长度。例如，如果有一个CHAR(255)的 列，如果在前10 个或20 个字符内，多数值是惟一的，那么就不要对整个列进行索引。短索引不仅可以提高查询速度而且可以节省磁盘空间和I/O操作。
> 4. 排序的索引问题，MySQL查询只使用一个索引，因此如果WHERE子句中已经使用了索引的话，那么ORDER BY中的列是不会使用索引的。因此数据库默认排序可以符合要求的情况下不要使用排序操作；尽量不要包含多个列的排序，如果需要最好给这些列创建复合索引。
> 5. LIKE语句操作，一般情况下不鼓励使用LIKE操作，如果非使用不可，如何使用也是一个问题。like “%aaa%” 不会使用索引而like “aaa%”可以使用索引。
> 6. 不要在列上进行运算，SELECT * FROM users WHERE YEAR(adddate)。


----------
## **附阿里巴巴Java开发手册MySQL数据库规范**
### **索引规约**

【强制】使用 ISNULL() 来判断是否为NULL值。

说明: NULL 与任何值的直接比较都为 NULL。

【推荐】建组合索引的时候,区分度最高的在最左边。

说明:存在非等号和等号混合判断条件时,在建索引时,请把等号条件的列前置。如: where a > ? and b = ? 那么即使 a 的区分度更高,也必须把 b 放在索引的最前列。


----------
## **参考阅读**

[MySQL索引类型总结和使用技巧以及注意事项](http://www.jb51.net/article/49346.htm)

[MySQL 索引分析和优化](http://www.jb51.net/article/5052.htm)

[如何创建索引、什么时候该创建、什么时候不应该创建](http://blog.csdn.net/xyh94233/article/details/6935669)

阿里巴巴Java开发手册--MySQL数据库