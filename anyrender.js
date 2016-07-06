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
			var ex = anyrender.extend;
			var dom = this;
			var span = definedDom('span', {
				class: 'any-edit',
				text: val
			});
			var input = definedDom('input', ex({
				onclick: function (e) {
					e.stopPropagation();
					e.preventDefault();
				},
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
				span.textContent = this.value;
				dom.replaceChild(span, input);
				item[colName] = this.value;
				if (_onblur)_onblur.call(this, e);
			};

			span.onclick = function (e) {
				e.stopPropagation();
				e.preventDefault();
				dom.replaceChild(input, span);
				input.focus();
				input.select();
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
			}
		}
	)
}();