**Anytable API**

**简介：**

Anytable 表格是完全原生JS写的表格插件。实现了mmgrid的大部分API，在表格渲染性能上有很大提升。

特点：

一、它预先计算每行数据高度，然后根据滚动条位置只局部渲染可视部分的表格，以节约性能。

二、renderer方法可以返回Node类型，方便事件的自由加载而不用拼凑Html

三、列的拖拉拽很流畅，其样式直接写入CSSRule，存放在头部饭在头部看不到样式具体内容。

四、底部面板控制列显示以及位置（同样由拖拽实现）

五、有功能全面的筛选页【进行中】

六、具备简单的列冻结功能



**Anytable ( selector , options )**

说明：Anytable 类 ，需要使用 new 来实例化，取该选择器的第一个匹配元素生并成表格控件

类型：类

参数：

selector - {String } 选择器

options - {Object} 表格配置 具体参见后面的【表格配置】

**destory ()**

说明：销毁表格（功能需改进）

类型：方法

参数：无

返回：无

**pager**

说明：存放页码信息，直接赋值/取值即可

类型：对象

包含：

cur  - 当前页

size         - 页面显示条数

total - 总条数

**showMsg ( text , loadingIcon )**

说明：在表格中显示有遮罩层的消息

类型：方法

参数：

text - {String} 显示的文字

loadingIcon - {Boolean} 是否显示加载图标动画 默认 false

返回：this

**hideMsg ()**

说明：销毁消息

类型：方法

参数：无

返回：this

**row ( index )**

说明：返回指定行号的数据，行号为该数据在筛选后数据的所在位置

类型：方法

参数：index - {Number} 数据所在行

返回：{Object} 对应行的数据

**addRow ( datas, index )**

说明：将数据添加到指定行

类型：方法

参数：

datas - { Array|Object } 添加的数据 可以是多条数据的数组或者单个对象

index - {Number}                 数据所在行

返回：{Object} 当前的Anytable对象（todo：返回需统一）

**updateRow ( datas, index ,extend)**

说明：将数据更新到指定行

类型：方法

参数：

datas - { Array|Object } 更新的数据 可以是多条数据的数组或者单个对象

index - {Number}                 数据所在行

extend - {Boolean}                 继承添加的数据而不是替换(继承可以保存之前的状态信息【未测】) 默认false

返回：this

**removeRow (index)**

说明：移除指定条件的数据

类型：方法

参数：

index

- {Number}        移除指定行

- {Array}                移除多行

- {Function}

function(data)

说明：移除 **不** 符合条件的行(即方法返回false 或无返回会移除该行)

入参：data 遍历的每行数据

返回：{ Boolean } true ： 保留该行 others：移除该行

返回：this

**select ( index )**

说明：选中符合条件的指定行

类型：方法

参数：

index

- {Number}         数据所在行

- {Array}                 未实现

- {Function}         未实现

返回：this

**deselect( index )**

说明：取消选中符合条件的指定行

类型：方法

参数：

index

- {Number}         数据所在行

- {Array}                 未实现

- {Function}         未实现

返回：this

**selectedRows ( index )**

说明：返回选中行数据

类型：方法

参数：index - {Number}【可选】        返回选中行数据中对应下标的单条数据

返回：{Array}

**selectedRowsIndex ( index )**

说明：返回选中行数据的行号

类型：方法

参数：index - {Number}【可选】        返回选中行数据行号中对应下标的单条行号

返回：{Array}

**rows ()**

说明：返回过滤后全部行数据

类型：方法

参数：无

返回：{Array}

**initHead ()**

说明：初始化表格头部(正常情况下不需要去执行这个方法)

类型：方法

参数：无

返回：this

**initFoot ()**

说明：初始化表格底部(正常情况下不需要去执行这个方法)

类型：方法

参数：无

返回：this

**initView (resetScroll)**

说明：渲染可视区域表格

类型：方法

参数：resetScroll - {Boolean} 渲染时候是否将滚动条置顶 默认false

返回：this

**load (datas)**

说明：载入数据

类型：方法

参数：datas- {Array|Object} 【可选】加载指定的数据,如果没有该参数且在表格配置中配置了url则加载远程数据

返回：this

**setData ( datas )**

说明：设置表格数据为参数中的数据

类型：方法

参数：datas- {Array|Object} 设置表格的数据为当前数据

返回：this

**freeze ( length )**

说明：冻结指定长度的列（拖拽后该范围内的列依旧生效）

类型：方法

参数：length- {number} 冻结的列数量

返回：this



**【表格配置 options】**

  **options：**
 **autoLoad**

说明：自动加载 默认true （暂未实现false）

类型：Boolean

**dataGainer**

说明：配置远程数据获取方法

类型：Function

默认：function(url,method,params,done,fail){
                             ajaxWorker(url,{
                        type: method,
                         contentType: &quot;application/json&quot;,
                         dataType: &quot;json&quot;,
                         data:JSON.stringify(params)
                      }).done(done).fail(fail)
                   }

**url**

说明：配置远程数据接口地址

类型：String

默认：undefined

**method**

说明：配置远程数据获取方法

类型：String

默认：undefined

**params**

说明：配置远程数据参数

类型：Object

默认：undefined

  **cache**

说明：缓存请求结果【未实现】

类型：Boolean

默认：false

**loadingText**

说明：加载数据文字

类型：String

默认：&#39;正在载入&#39;

**noDataText**

说明：无数据文字

类型：String

默认：&#39;暂无数据&#39;

**loadErrorText**

说明：无数据文字

类型：String

默认：&#39;数据加载出现异常&#39;

**sortBy**

说明：排序【未实现】

类型：String

默认：&#39;&#39;

**nowrap**

说明：表格文本换行【未实现】

类型：Boolean

默认：false

**indexColWidth**

说明：行号宽度【未实现】

类型：Number

默认：30

**indexCol**

说明：显示行号【未实现】

类型：Boolean

默认：false

**toolBar**

说明：显示底部工具栏

类型：Boolean

默认：true

**paging**

说明：显示分页

类型：Object

默认：{
                           remote:false,  // 是否远程分页
                           pageSize:[100,200,300,500],  //每页显示条数
                           paramsName:{        // 请求字段映射
                              total:&#39;total&#39;,          // 总条数
                              size:&#39;pageSize&#39;,        // 每页显示多少
                              cur:&#39;currentPage&#39;                  // 请求页
                           }
                }

**allowFilter**

说明：        是否显示分页【未完成】，允许后，行头移上去有个展开按钮，

点击会有一个复杂的筛选配置页，用于生管理各种筛选条件

类型：Boolean

默认：false

**clickCanSelectRow**

说明：点击行是否触发行选中

类型：Boolean

默认：true

**checkCol**

说明：显示行勾选框

类型：Boolean

默认：false

**multiSelect**

说明：允许行多选

类型：Boolean

默认：false

**height**

说明：表格区域（不包括头和底部工具栏）高度

类型：Number

默认：300

**colMinWidth**

说明：最小列宽

类型：Boolean

默认：false

**rowHeight**

说明：默认行高

类型：Number

默认：20

**changeWidth**

说明：允许拖拽改变列宽

类型：Boolean

默认：true

 **dragRowHeight**

说明：允许拖拽改变行高【未实现】

类型：Boolean

默认：false

 **dragColumn**

说明：允许拖拽列

类型：Boolean

默认：true

 **cols**

说明：列配置 详见【列配置】

类型：Arra

默认：[]

 **root**

说明：远程数据行数据对应的属性名

类型：String

默认：&#39;rows&#39;

**scrollBarWidth**

说明：滚动条预设宽度，用于对隐藏表格渲染计算

类型：Boolean

默认：false

**【列配置】**

**title**

说明：列头显示名称

类型：String

默认：无

**name**

说明：列对应实际数据字段

类型：String

默认：无

**width**

说明：列宽

类型：Number

默认：100

**align**

说明：文字对齐方向

类型：

String         对头和行统一配置

 Object         头和行分开配置 e.g:  {head : &#39;left&#39; , cell : &#39;right&#39;}

默认：无

**renderer (val, item, rowIndex)**

说明：设置页面每列的数据渲染，已有的一些Render参见【anyrender】

类型：Function

入参：

val  - {String|Number} 列数据

item - {Object} 行数据

rowIndex -{number} 过滤数据后的行号

this：对应列的文档节点

返回：

{String} 生成的字符串会被解析为HTML插入到对应列节点

{Node} 生成的Node节点会被添加到对应的列节点【推荐这种，便于添加事件】

**options**

说明：行配置，当前仅支持 options.height - {Number}

类型：Object

默认：无

**sort**

说明：是否配置排序

类型：Boolean | Object  开启服务端排序【未实现】{remote: rue }

默认：false

**rowSelected (item,opt)**

说明：行选中触发事件

类型：Function

入参：

item - {Object} 行数据

opt        -{Object} 行状态

**rowDesSelected (item,opt)**

说明：行取消选中触发事件

类型：Function

入参：

item - {Object} 行数据

opt        -{Object} 行状态

**rowSelectChange (item,opt)**

说明：行选中状态改变触发事件

类型：Function

入参：

item - {Object} 行数据

opt        -{Object} 行状态

【行API】 **tr 上的方法/属性：**

**select ()**

说明：选中该行 触发行选中事件 如状态改变触发选中状态改变事件

类型：Function

入参：无

返回：无

**desSelect( )**

说明：取消选中该行 触发行取消选中事件 如状态改变触发选中状态改变事件

类型：Function

入参：无

返回：无

**height**

说明：或许/改变行高 赋值触发刷新滚动条位置

类型：Number

入参：无

返回：无

**【列API】 td上的方法/属性：**

**getValue ()**

说明：返回该位置的实际值

类型：Function

入参：无

返回：{\*}

**setValue (value,needRender)**

说明：设置该位置的值

类型：Function

入参：

value - {\*} 设置该位置的值

needRender - {Boolean}  true-重新渲染该位置元素 ， 默认 false

返回：无





**anyrender API**

这个命名空间的两个方法是用来构造便于使用的Renderer，通过不同的连接书写显示不同需求的Render

**create (name, init,func, extra)**

说明：创建便捷的Renderer

参数：

name  - {String}         Render名称

init - {Function}         function(opt) 初始化配置 返回opt -{object}

func - {Function}         返回的Render方法

extra - {Object}        拓展的附加Render方法 e.g { number : function( opt, func ){} }

返回：无

**extend (a,b)**

说明：简单的继承实现



**【anyrender.js】** - 存放各种Renderer方法

已有内容

**anyrender.edit**  - 点击Cell后显示文本编辑框，失去焦点还原。改变值会同时改变行数据

**anyrender.edit.number** - 实现了 **edit** 中方法限制文本只能是数字

**anyrender.edit.max (100)** - 实现了 **number** 中的内容，并且规定了输入的最大值

**anyrender.edit.min(0)** -        实现了 **number** 中的内容，并且规定了输入的最小值
