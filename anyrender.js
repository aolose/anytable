/**
 *  放置各种render组件
 *  @Object anyRender
 * */
!function () {
	var rd = anyrender.create;
	/**
	 * @description
	 *    输入框组件
	 *    点击切换到输入框 失去焦点则还原
	 * @example
	 *    anyrender.edit
	 *    anyrender.edit.number
	 *    anyrender.edit.max(10)
	 * */
	rd('edit',
		function () {
			var es=[];
			es.add = function(){es.push(arguments)};
			return {
				dom: {},
				events: es
			}
		},
		function (val, item, rowIndex, colName, opt) {
			var dom = this;
			var span = definedDom('span', {
				class: 'any-edit',
				text: val
			});
			var ex = anyrender.extend;
			var input = definedDom('input', ex({
				onclick: function (e) {
					e.stopPropagation();
					e.preventDefault();
					if(opt.onclick)opt.onclick.call(input);
				},
				// todo
				value: val,
				class: 'any-edit',
				type: 'text'
			}, opt.dom));
			for (var i = 0, es = opt.events, l = es.length; i < l; i++) {
				var e = es[i];
				input.addEventListener(e[0], e[1], e[2]);
			}

			var _onblur = input.onblur;
			input.onblur = function (e) {
				if(opt.onblur){
					opt.onblur.call(this,e)
				}else{
					span.textContent = this.value;
					dom.replaceChild(span, input);
					item[colName] = this.value;
				}
				if (_onblur)_onblur.call(this, e);
			};

			span.onclick = function (e) {
				e.stopPropagation();
				e.preventDefault();
				dom.replaceChild(input, span);
				opt._input = input;
				opt._span = span;
				opt._replace = function(){
					dom.replaceChild(span, input);
				};
				opt._save = function(v){
					item[colName] = v;
				};
				if(opt.afterRender){
					opt.afterRender.call(input);
				}else {
					input.focus();
					input.select();
				}
			};
			return span;
		}, {
			number: function (opt,func) {
				func._number=true;
				opt.events.add('keydown',function(e){
					var keyCode = e.keyCode;
					var ctrlKey = e.ctrlKey;
					var shiftKey = e.shiftKey;
					var key = e.key;
					var _v = this.value;

					if(_v===''){
						if(key==='-')return;
					}else if(key==='.'&&-1===_v.indexOf('.'))
						return;

					if([46, 8, 9, 27, 13, 110, 190].indexOf(keyCode)!==-1||
						(keyCode == 65 && ctrlKey === true) || // Ctrl+A
						(keyCode == 67 && ctrlKey === true) || // Ctrl+C
						(keyCode == 86 && ctrlKey === true) || // Ctrl+V
						(keyCode == 88 && ctrlKey === true) || // Ctrl+X
						(keyCode >= 35 && keyCode <= 39)// home, end, left, right
					){
						return;
					}
					if((shiftKey|| (keyCode < 48 || keyCode > 57)) && (keyCode < 96 || keyCode > 105)){
						e.preventDefault();
					}
				});
				opt.events.add('paste',function(e){
					e.preventDefault();
					var startPos = this.selectionStart;
					var length = this.selectionEnd-startPos;
					var data = e.clipboardData.getData('text/plain').replace(/[^0-9\.-]/g,'').replace(/\.{2}/g,'');
					var _d = data[0]||'';
					var _dd = data.substr(1).replace(/-/g,'')||'';
					if(this.value[0]==='-'&&_d==='-')_d='';
					var value =parseFloat( this.value.replace(new RegExp('(.{'+startPos+'}).{'+length+'}'),'$1'+_d+_dd));
					if(!isNaN(value))this.value =value ;
					if(func._min)func._min.call(this);
					if(func._max)func._max.call(this);
				})
			},
			max: function (opt, func) {
				if(!func._number)func=func.number;
				return function (v) {
					func._max=function(){
						if(parseFloat(this.value)>=v)this.value=v;
					};
					opt.events.add('input',func._max);
					return func;
				}
			},
			min: function (opt, func) {
				if(!func._number)func=func.number;
				return function (v) {
					func._min=function(){
						if(parseFloat(this.value)<=v)this.value=v;
					};
					opt.events.add('input',func._min);
					return func;
				}
			},
			datePicker:function(opt,func){
				var fixTime = function(n){
					return (100+parseInt(n)+'').substr(1);
				};
				var outClick=function(e){
					var target = e.target;
					if(target!==opt._input&&target!==pick.dom&&!pick.dom.contains(target)){
						opt._replace();
						pick.close();
						window.removeEventListener('click',outClick,true);
					}
				};
				var format = function(obj,str){
					return str&&str.replace('YYYY',obj.year)
						.replace('MM',fixTime(obj.month+1))
						.replace('M',obj.month+1)
						.replace('DD',fixTime(obj.date))
						.replace('D',obj.date)
						.replace('hh',fixTime(obj.hour))
						.replace('h',obj.hour)
						.replace('mm',fixTime(obj.minute))
						.replace('m',obj.minute)
						.replace('ss',fixTime(obj.second))
						.replace('s',obj.second)||(1*obj.dateValue+obj.timeValue)
				};
				if(!rd.anydate)rd.anydate=new Anydate();
				var pick = rd.anydate;
				/**
				 *  _opt ={
				 * 	min:'1900-11-24',
				  * 	max:'2019-11-22',
				 *  	format:'YYY-MM-DD hh:mm:ss'
				 *     save:'format|number',
				 *     pick:func
				 *  }
				 *
				 * */
				return function (_opt) {
					var ex = anyrender.extend;
					_opt=ex({
						format:'YYYY-MM-DD hh:mm:ss',
						save:'format',
						pick:function(sel){
							console.log('after you click the date ',sel)
						}
					},_opt);
					opt.onclick = opt.afterRender = function(){
						window.addEventListener('click',outClick,true);
						var x = this.getBoundingClientRect(), s = pick.dom.style;
						s.left = x.left+'px';
						s.top = x.top+this.offsetHeight+'px';
						_opt.date = this.value;
						pick.open(_opt);
					};
					_opt.onDatePick = function(sel,noClose){
						var v = format(sel,_opt.format);
						var _v = _opt.save==='number'&&(1*sel.dateValue+sel.timeValue)||v;
						opt._input.value = v;
						opt._span.textContent = v;
						opt._save(_v);
						if(!noClose)pick.close();
						if(_opt.pick)_opt.pick();
					};
					opt.onblur=function(){
						var v = new Date(this.value);
						if(!isNaN(v.valueOf())){
							pick.picked.init(v);
							_opt.onDatePick(pick.picked,true)
						}
					};
					return func;
				}
			}
		}
	)
}();