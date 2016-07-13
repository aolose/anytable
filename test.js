var add = document.querySelector('#add');
var del = document.querySelector('#del');

var colLis = ['#F44336', '#009688', '#03A9F4', '#FFEB3B', '#FF5722', '#607D8B', '#795548', '#673AB7', '#8BC34A'];
var cols = [
	{title:'c-0',cols:[
		{title: 'c-0-1', name: 'c1', width: 90,  align:'center',renderer:function(v){return v+5}},
		{title: 'c-0-2', cols:[{name: 'c1', width: 90,  align:'center',title:'ooxx'}]}
	]},
	{
		title: 'c-1', name: 'c1', width: 90,  align:'center',
		renderer: anyrender.edit.datePicker({
			format:'YYYY/M/D hh:m:s',
			max:'2016-10-31',
			min:'2016-8-2'
		})
	},
	{
		title: 'c-2', name: 'c2', width: 90, align:{
			head:'left',
			cell:'right',
			tasks:[]//
		},
		renderer: function (val, item, rowIndex) {
		this.style.background = colLis[rowIndex % 9];
		return rowIndex;
	}
	},
	{
		title: 'c-3', name: 'c3', width: 90,  align:'center',renderer: function (val, item, rowIndex) {
		return new Date(val).toLocaleDateString();
	}
	},

	{title: 'c-4', name: 'c4', align:'right', width: 90,renderer:anyrender.edit.max(100)}
];
var cols2 = [
	{
		title: 'c-1', name: 'c1', width: 90,  align:'center',
		renderer: anyrender.edit.number
	},
	{
		title: 'c-2', name: 'c2', width: 90, align:{
			head:'left',
			cell:'right',
			tasks:[]//
		},
		renderer: function (val, item, rowIndex) {
		this.style.background = colLis[rowIndex % 9];
		return rowIndex;
	}
	},
	{
		title: 'c-3', name: 'c3', width: 90,  align:'center',renderer: function (val, item, rowIndex) {
		return new Date(val).toLocaleDateString();
	}
	},

	{title: 'c-4', name: 'c4', align:'right', width: 90,renderer:anyrender.edit.max(100)}
];

var dataGenerator = function (n) {
	console.log('Data length:', n);
	console.time('dataGenerator');
	var d = [];
	for (var i = 0; i < n; i++) {
		d.push({
			c1: parseInt(100000*Math.random()),
			c2: Date.now() + 1000 * 24,
			c3: i,
			c4: parseInt(100000*Math.random()+i)
		})
	}
	console.timeEnd('dataGenerator');
	return d;
};


var mt = new Anytable('#myTable1', {
	//url:'text/ooxx',
	method:'post',
	sort:true,
	params:{},
	//toolBar:false,
	paging:{
		// 服务端
		//remote:true,
		// 每页数量
		pageSize:[200,250,300,500],
		// 如果有该属性则为远程分页
		// 用于映射本地对应字段
		//paramsName:{
		//	total:'total',				// 总数
		//	size:'pageSize',			// 每页显示多少
		//	cur:'currentPage'  // 请求页
		//}
	},
	allowFilter:true,
	root:'rows',
	cols: cols,
	height: 300,
	checkCol:true,
	dragColumn: true,
	multiSelect:true,
	rowSelected:function(){
		console.log(arguments)
	},
	rowDesSelected:function(){
		console.log(arguments)
	},
	rowSelectChange:function(){
		console.log(arguments)
	}
});
var mt2 = new Anytable('#myTable2', {
	//url:'text/ooxx',
	method:'post',
	sort:true,
	params:{},
	//toolBar:false,
	paging:{
		// 服务端
		//remote:true,
		// 每页数量
		pageSize:[200,250,300,500],
		// 如果有该属性则为远程分页
		// 用于映射本地对应字段
		//paramsName:{
		//	total:'total',				// 总数
		//	size:'pageSize',			// 每页显示多少
		//	cur:'currentPage'  // 请求页
		//}
	},
	allowFilter:true,
	root:'rows',
	cols: cols2,
	height: 300,
	checkCol:true,
	dragColumn: true,
	multiSelect:true,
	rowSelected:function(){
		console.log(arguments)
	},
	rowDesSelected:function(){
		console.log(arguments)
	},
	rowSelectChange:function(){
		console.log(arguments)
	}
});

add.onclick = function(){
	mt.addRow(dataGenerator(1),mt.selectedRowsIndex(0)+1);
};
del.onclick = function(){
	mt.removeRow(mt.selectedRowsIndex());
};

var datas = dataGenerator(10000);
datas[3].options={height:100};
datas[5].options={height:88};
datas[7].options={height:100};
datas[6].options={height:100};
datas[19].options={height:100};
datas[11].options={height:144};
mt.setData(datas);
//mt2.setData(datas);
//renderTasks
