var MavClip = new Class({
	'Implements': [Options, Events],
	'Binds': ['cropping','stop'],
	'options': {
		'autoDraw': true,
		'coords': null, // {'x':Integer, 'y': Integer, 'width': Integer, 'height': Integer},
		'keepRatio': false,
		'constrain': false,
		'shiftConstrains': false,
		'hideAfterSave': true,
		'min': { 'width': 20, 'height': 20 },
		'max': { 'width': null, 'height': null }
/*
	onBeforeDrag: $empty(), 
	onDrag: $empty(), 
	onDragComplete: $empty(),

	onBeforeResize: $empty(),
	onResize: $empty(),
	onResizeComplete: $empty(),

	onInit: $empty(),
	onDraw: $empty(),
	onSave: $empty(),
	onCancel: $empty()
 */
	},

	imgElement: null,
	element: null,
	coords: {'w':null,'h':null,'t':null,'l':null},
	clip: null,
	clipShade: null,
	clipBox: null,
	clipper: null,
	cropDragger: null,
	clipWrap: null,
	xy: null,
	elXY: null,
	resizeXY: null,
	resizeDirection: null,
	cropData: {'l':null,'t':null,'w':null,'h':null},

	initialize: function(element, options) {
		this.setOptions(options);
		this.element = (document.id(element) || null);
		this.coords = ($chk(this.options.coords) ? this.options.coords : this.coords);

		if (this.options.autoDraw) { this.draw(); }
		this.fireEvent('init');
	},

	save: function() {
		var xy = this.clipper.getCoordinates(),
			exy = this.element.getCoordinates();

		this.cropData = {
			'x': (xy.left - exy.left),
			'y': (xy.top - exy.top),
			'w': xy.width,
			'width': xy.width,
			'h': xy.height
			'height': xy.height
		};
		this.cropData.b = this.cropData.y + this.cropData.h;
		this.cropData.bottom = this.cropData.b;
		this.cropData.r = this.cropData.x + this.cropData.w;
		this.cropData.right = this.cropData.r;
		

		this.fireEvent('save');

		if (this.options.hideAfterSave) {
			this.hide();
		}

		return this.cropData;
	},

	detach: function() {

	},

	attach: function() {

	},

	cancel: function() {
		this.cropData = {};
		this.clipShade.dispose();
		this.xy = this.clip = this.clipShade = this.clipBox = this.clipper = this.clipWrap = this.elXY = this.cropDragger = this.resizeDirection = this.resizeXY = null;

		if (this.imgElement) {
			this.element.dispose();
			this.imgElement.setStyle('display', this.originalDisplay);
		}

		this.fireEvent('cancel');
	},

	draw: function() {
		if (this.element.get('tag') == 'img') {
			var imgSrc = this.element.get('src'),
				imgY = this.element.height,
				imgX = this.element.width;

			this.originalDisplay = this.element.getStyle('display');
			this.imgElement = this.element;

			this.element = new Element('div', {
				'class': this.imgElement.get('class'),
				'style': this.imgElement.get('style'),
				'styles': {
					'width': imgX + 'px',
					'height': imgY + 'px',
					'background': 'transparent url(' + imgSrc + ') no-repeat center center'
				}
			}).inject(this.imgElement, 'after');

			this.imgElement.setStyle('display', 'none');
		}

		this.elXY = this.element.getCoordinates();
		this.elXY.w = this.elXY.width;
		this.elXY.h = this.elXY.height;
		this.elXY.x = this.elXY.left;
		this.elXY.y = this.elXY.top;

		var w = (this.coords.w ? this.coords.w : this.elXY.w * .70),
			h = (this.coords.h ? this.coords.h : this.elXY.h * .70),
			t = (this.coords.t ? this.coords.t : ((this.elXY.h - h) / 2)),
			l = (this.coords.l ? this.coords.l : ((this.elXY.w - w) / 2));

		this.clip = {
			't': t,
			'r': (l + w),
			'b': (t + h),
			'l': l
		};

		this.clipShade = new Element('div', {
			'class': 'clip-shade',
			'styles': { 'width': this.elXY.w, 'height': this.elXY.h }
		}).inject(this.element);

		this.clipBox = new Element('div', {
			'class': 'clip-box',
			'styles': {
				'background-image': this.element.getStyle('background-image'),
				'width': this.elXY.w,
				'height': this.elXY.h
			}
		}).inject(this.clipShade);
		this.setClip(this.clip);

		this.clipper = new Element('div', {
			'class': 'clipper-box',
			'styles': {
				'width': w,
				'height': h,
				'top': t,
				'left': l
			}
		}).inject(this.clipShade);

		this.clipWrap = new Element('div', {
			'class': 'clipper-wrap',
			'styles': { 'width': w-2, 'height': h-2 }
		}).inject(this.clipper);

		new Element('div', {'class': 'cb-handle cb-tl'}).addEvent('mousedown', this.start.bind(this)).inject(this.clipWrap);
		new Element('div', {'class': 'cb-handle cb-tr'}).addEvent('mousedown', this.start.bind(this)).inject(this.clipWrap);
		new Element('div', {'class': 'cb-handle cb-bl'}).addEvent('mousedown', this.start.bind(this)).inject(this.clipWrap);
		new Element('div', {'class': 'cb-handle cb-br'}).addEvent('mousedown', this.start.bind(this)).inject(this.clipWrap);

		this.cropDragger = new Drag.Move(this.clipper, {
			'container': this.element,
			'handle': this.clipWrap,
			'stopPropagation': true,
			'onBeforeStart': function(el) {
				this.fireEvent('dragStart');
			}.bind(this),
			'onDrag': function(el) {
				var t = el.getStyle('top').toFloat(),
					l = el.getStyle('left').toFloat(),
					w = el.getStyle('width').toFloat(),
					h = el.getStyle('height').toFloat();

				clip = { 't': t, 'r': l + w, 'b': t + h, 'l': l };
				this.setClip(clip);

				this.fireEvent('drag');
			}.bind(this),
			'onComplete': function(el) {
				this.fireEvent('dragComplete');
			}.bind(this)
		});

		this.fireEvent('draw');
	},

	setClip: function(clip) {
		this.clipBox.setStyle('clip', 'rect(' + clip.t + 'px,' + clip.r + 'px,' + clip.b + 'px,' + clip.l + 'px)');
	},

	start: function(e) {
		this.resizeDirection = e.target.className.replace(/cb-handle cb-/, '');
		this.resizeXY = this.clipper.getCoordinates();

		var maxX, maxY, minX, minY;

		switch(this.resizeDirection) {
			case 'tr':
				minX = this.resizeXY.left + this.options.min.width;
				maxX = (this.options.max.width == null ? this.elXY.right : (this.resizeXY.left + this.options.max.width));
				maxX = (maxX <= this.elXY.right ? maxX : this.elXY.right);

				minY = (this.options.max.height == null ? this.elXY.top : (this.resizeXY.bottom - this.options.max.height));
				minY = (minY >= this.elXY.top ? minY : this.elXY.top);
				maxY = this.resizeXY.bottom - this.options.min.height;
				break;

			case 'tl':
				minX = (this.options.max.width == null ? this.elXY.left : (this.resizeXY.right - this.options.max.width));
				minX = (minX >= this.elXY.left ? minX : this.elXY.left);
				maxX = this.resizeXY.right - this.options.min.width;

				minY = (this.options.max.height == null ? this.elXY.top : (this.resizeXY.bottom - this.options.max.height));
				minY = (minY >= this.elXY.top ? minY : this.elXY.top);
				maxY = this.resizeXY.bottom - this.options.min.height;
				break;

			case 'br':
				minX = (this.resizeXY.left + this.options.min.width);
				maxX = (this.options.max.width == null ? this.elXY.right : this.resizeXY.left + this.options.max.width);
				maxX = (maxX <= this.elXY.right ? maxX : this.elXY.right);

				minY = this.resizeXY.top + this.options.min.height;
				maxY = (this.options.max.height == null ? this.elXY.bottom : this.resizeXY.top + this.options.max.height);
				maxY = (maxY <= this.elXY.bottom ? maxY : this.elXY.bottom);
				break;

			case 'bl':
				minX = (this.options.max.width == null ? this.elXY.left : (this.resizeXY.right - this.options.max.width));
				minX = (minX >= this.elXY.left ? minX : this.elXY.left);
				maxX = (this.resizeXY.right - this.options.min.width);

				minY = this.resizeXY.top + this.options.min.height;
				maxY = (this.options.max.height == null ? this.elXY.bottom : (this.resizeXY.top + this.options.max.height));
				maxY = (maxY <= this.elXY.bottom ? maxY : this.elXY.bottom);

				break;
		}

		this.xy = {
			'ox': e.page.x,
			'oy': e.page.y,
			'c': {
				't': (this.resizeXY.top - this.elXY.y),
				'l': (this.resizeXY.left - this.elXY.x),
				'w': (this.resizeXY.width),
				'r': (this.resizeXY.right - this.elXY.x),
				'h': (this.resizeXY.height),
				'b': (this.resizeXY.bottom - this.elXY.y)
			},
			'b': {
				'lx': minX,
				'mx': maxX,
				'ly': minY,
				'my': maxY
			}
		};

		this.cropDragger.detach();
		window.addEvent('mousemove', this.cropping);
		window.addEvent('mouseup', this.stop);

		this.fireEvent('beforeResize');
	},

	cropping: function(e) {
		var xCan = (e.page.x >= this.xy.b.lx && e.page.x <= this.xy.b.mx),
			yCan = (e.page.y >= this.xy.b.ly && e.page.y <= this.xy.b.my);

		switch(this.resizeDirection) {
			case 'tr':
				if (yCan) {
					this.xy.c.t = (e.page.y - this.elXY.y);
					this.xy.c.h = (this.xy.c.b - this.xy.c.t);
				}
				if (xCan) {
					this.xy.c.w = (e.page.x - (this.elXY.x +this.xy.c.l));
				}
				break;

			case 'tl':
				if (yCan) {
					this.xy.c.t = (e.page.y - this.elXY.y);
					this.xy.c.h = (this.xy.c.b - this.xy.c.t);
				}
				if (xCan) {
					this.xy.c.l = (e.page.x - this.elXY.x);
					this.xy.c.w = (this.xy.c.r - this.xy.c.l);
				}

				break;

			case 'br':
				if (xCan) {
					this.xy.c.w = (e.page.x - this.elXY.x - this.xy.c.l);
				}
				if (yCan) {
					this.xy.c.h = (e.page.y - this.elXY.y - this.xy.c.t);
				}
				break;

			case 'bl':
				if (yCan) {
					this.xy.c.h = (e.page.y - this.elXY.y - this.xy.c.t);
				}
				if (xCan) {
					this.xy.c.l = (e.page.x - this.elXY.x);
					this.xy.c.w = (this.xy.c.r - this.xy.c.l);
				}
				break;
		}

		this.clipper.setStyles({
			'top': this.xy.c.t + 'px',
			'left': this.xy.c.l + 'px',
			'width': this.xy.c.w + 'px',
			'height': this.xy.c.h + 'px'
		});
		this.clipWrap.setStyles({
			'width': (this.xy.c.w - 4) + 'px',
			'height': (this.xy.c.h - 4) + 'px'
		});

		this.clip = this.xy.c;
		this.clip.b = this.xy.c.t + this.xy.c.h;
		this.clip.r = this.xy.c.l + this.xy.c.w;

		this.setClip(this.clip);

		this.fireEvent('resize');
	},

	stop: function(e) {
		this.resizeDirection = null;

		this.cropDragger.attach();
		window.removeEvent('mousemove', this.cropping);
		window.removeEvent('mouseup', this.stop);

		this.fireEvent('resizeComplete');
	}
});