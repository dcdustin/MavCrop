/*
---

script MavCrop.js
version: 0.7.1.2
description: MavCrop class. Provides method for interactively cropping images
license: MIT-style
authors:
  - Dustin Hansen

requires: [Core/*, More/Class.Binds, More/Drag.Move]

provides: [MavCrop]

...
*/
var MavCrop = new Class({

	'Implements': [Options, Events],

	'Binds': ['sizing','stop'],
	
	'options': {
		'autoDraw': true,								// generates cropping area on instantiation
		'coords': null,									// {'x':Integer, 'y': Integer, 'width': Integer, 'height': Integer},
//		'keepRatio': false,								// keeps the original ratio of the cropping area
//		'constrain': false,	
//		'shiftConstrains': false,
		'hideAfterCrop': true,							// hides cropping area after cropping is accepted
		'min': { 'x': 20, 'y': 20 },			// minimum width/height for cropping area
		'max': { 'x': null, 'y': null },		// maximum width/height for cropping area
		'sendImagePath': false							// send image path as variable in cropping data
/*
	,onBeforeDrag: $empty()
	,onDrag: $empty()
	,onDragComplete: $empty()

	,onBeforeResize: $empty()
	,onResizing: $empty()
	,onResizeComplete: $empty()

	,onInit: $empty()
	,onDraw: $empty()
	,onCrop: $empty()
	,onShow: $empty()
	,onHide: $empty()
	,onCancel: $empty()
 */
	},

	imgElement: null,
	element: null,
	coords: {'w':null,'h':null,'y':null,'x':null},
	clip: null,
	cropShade: null,
	clipBox: null,
	cropper: null,
	cropDragger: null,
	cropWrap: null,
	xy: null,
	elXY: null,
	resizeXY: null,
	resizeDirection: null,
	cropData: null,
	wrapper: null,

	initialize: function(element, options) {
		this.setOptions(options);

		this.element = (document.id(element) || null);

		this.coords = ($chk(this.options.coords) ? this.options.coords : this.coords);

		// This ridiculousness brought to you by IE7 and IE8.
		// because IE7 and IE8 do not allow mousemove on the window object, we must make an exception.
		var ie7 = ($chk(Browser['ie7']) ? true : (($chk(Browser['engine']) && Browser.engine['version'] == 7) ? true : false));
		var ie8 = ($chk(Browser['ie8']) ? true : (($chk(Browser['engine']) && Browser.engine['version'] == 8) ? true : false));
		this.wrapper = (ie7 || ie8) ? document.id(document.body) : window;

		if (this.options.autoDraw) { this.draw(); }

		this.fireEvent('init', this);
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

		var w = (this.coords.w ? this.coords.w : this.elXY.width * 0.70),
			h = (this.coords.h ? this.coords.h : this.elXY.height * 0.70),
			t = (this.coords.y ? this.coords.y : ((this.elXY.height - h) / 2)),
			l = (this.coords.x ? this.coords.x : ((this.elXY.width - w) / 2));

		this.clip = {
			't': t,
			'r': (l + w),
			'b': (t + h),
			'l': l
		};

		this.cropShade = new Element('div', {
			'class': 'mc-crop-shade',
			'styles': { 'width': this.elXY.width, 'height': this.elXY.height }
		}).inject(this.element);

		this.clipBox = new Element('div', {
			'class': 'mc-crop-box',
			'styles': {
				'background-image': this.element.getStyle('background-image'),
				'width': this.elXY.width,
				'height': this.elXY.height
			}
		}).inject(this.cropShade);
		
		this.setClip(this.clip);

		this.cropper = new Element('div', {
			'class': 'mc-cropper-box',
			'styles': {
				'width': w,
				'height': h,
				'top': t,
				'left': l
			}
		}).inject(this.cropShade);

		this.cropWrap = new Element('div', {
			'class': 'mc-cropper-wrap',
			'styles': { 'width': w-2, 'height': h-2 }
		}).inject(this.cropper);

		new Element('div', {'class': 'mc-cb-handle mc-cb-tl'}).addEvent('mousedown', this.start.bind(this)).inject(this.cropWrap);
		new Element('div', {'class': 'mc-cb-handle mc-cb-tr'}).addEvent('mousedown', this.start.bind(this)).inject(this.cropWrap);
		new Element('div', {'class': 'mc-cb-handle mc-cb-bl'}).addEvent('mousedown', this.start.bind(this)).inject(this.cropWrap);
		new Element('div', {'class': 'mc-cb-handle mc-cb-br'}).addEvent('mousedown', this.start.bind(this)).inject(this.cropWrap);

		this.cropDragger = new Drag.Move(this.cropper, {
			'container': this.element,
			'handle': this.cropWrap,
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

	cropImage: function() {
		var xy = this.cropper.getCoordinates(),
			exy = this.element.getCoordinates();

		this.cropData = {
			'x': (xy.left - exy.left),
			'y': (xy.top - exy.top),
			'w': xy.width,
			'h': xy.height
		};
		
		if (this.options.sendImagePath) {
			this.cropData.image = this.element.getStyle('background-image').replace(/^url\(["']?|["']?\)$/gi, '');
		}

		if (this.options.hideAfterCrop) { 
			this.hide();
		}

		this.fireEvent('crop', [this.cropData]);

		return this.cropData;
	},

	show: function() {
		this.fireEvent('show');

		this.cropShade.setStyle('display', 'block');
	},

	hide: function() {
		this.fireEvent('hide');

		this.cropShade.setStyle('display', 'none');
	},

	// meh, don't think this is really quite what needs to be done.
	cancel: function() {
		this.cropData = {};

		this.cropShade.dispose();

		this.xy = this.clip = this.cropShade = this.clipBox = this.cropper = this.cropWrap = this.elXY = this.cropDragger = this.resizeDirection = this.resizeXY = null;

		if (this.imgElement) {
			this.element.dispose();
			this.imgElement.setStyle('display', this.originalDisplay);
		}

		this.fireEvent('cancel');
	},

	setClip: function(clip) {
		this.clipBox.setStyle('clip', 'rect(' + clip.t + 'px,' + clip.r + 'px,' + clip.b + 'px,' + clip.l + 'px)');
	},

	start: function(e) {
		this.resizeDirection = e.target.className.replace(/mc-cb-handle mc-cb-/, '');
		this.resizeXY = this.cropper.getCoordinates();

		var maxX, maxY, minX, minY;

		switch(this.resizeDirection) {
			case 'tr':
				minX = this.resizeXY.left + this.options.min.x;
				maxX = (this.options.max.x === null ? this.elXY.right : (this.resizeXY.left + this.options.max.x));
				maxX = (maxX <= this.elXY.right ? maxX : this.elXY.right);

			case 'tl':
				if (this.resizeDirection == 'tl') {
					minX = (this.options.max.x === null ? this.elXY.left : (this.resizeXY.right - this.options.max.x));
					minX = (minX >= this.elXY.left ? minX : this.elXY.left);
					maxX = this.resizeXY.right - this.options.min.x;
				}

				minY = (this.options.max.y === null ? this.elXY.top : (this.resizeXY.bottom - this.options.max.y));
				minY = (minY >= this.elXY.top ? minY : this.elXY.top);
				maxY = this.resizeXY.bottom - this.options.min.y;
				break;

			case 'br':
				minX = this.resizeXY.left + this.options.min.x;
				maxX = (this.options.max.x === null ? this.elXY.right : this.resizeXY.left + this.options.max.x);
				maxX = (maxX <= this.elXY.right ? maxX : this.elXY.right);

			case 'bl':
				if (this.resizeDirection == 'bl') {
					minX = (this.options.max.x === null ? this.elXY.left : (this.resizeXY.right - this.options.max.x));
					minX = (minX >= this.elXY.left ? minX : this.elXY.left);
					maxX = this.resizeXY.right - this.options.min.x;
				}

				minY = this.resizeXY.top + this.options.min.y;
				maxY = (this.options.max.y === null ? this.elXY.bottom : (this.resizeXY.top + this.options.max.y));
				maxY = (maxY <= this.elXY.bottom ? maxY : this.elXY.bottom);

				break;
		}

		this.xy = {
			'ox': e.client.x,
			'oy': e.client.y,
			'c': {
				't': (this.resizeXY.top - this.elXY.top),
				'l': (this.resizeXY.left - this.elXY.left),
				'w': (this.resizeXY.width),
				'r': (this.resizeXY.right - this.elXY.left),
				'h': (this.resizeXY.height),
				'b': (this.resizeXY.bottom - this.elXY.top)
			},
			'b': {
				'lx': minX,
				'mx': maxX,
				'ly': minY,
				'my': maxY
			}
		};

		this.cropDragger.detach();

		this.fireEvent('beforeResize');
		
		this.wrapper.addEvent('mousemove', this.sizing);

		this.wrapper.addEvent('mouseup', this.stop);
	},

	sizing: function(e) {
		var xCan = (e.page.x >= this.xy.b.lx && e.page.x <= this.xy.b.mx),
			yCan = (e.page.y >= this.xy.b.ly && e.page.y <= this.xy.b.my);

		switch(this.resizeDirection) {
			case 'tr':
				if (xCan) {
					this.xy.c.w = (e.page.x - (this.elXY.left +this.xy.c.l));
				}

			case 'tl':
				if (xCan && this.resizeDirection == 'tl') {
					this.xy.c.l = (e.page.x - this.elXY.left);
					this.xy.c.w = (this.xy.c.r - this.xy.c.l);
				}

				if (yCan) {
					this.xy.c.t = (e.page.y - this.elXY.top);
					this.xy.c.h = (this.xy.c.b - this.xy.c.t);
				}

				break;

			case 'br':
				if (xCan) {
					this.xy.c.w = (e.page.x - this.elXY.left - this.xy.c.l);
				}

			case 'bl':
				if (xCan && this.resizeDirection == 'bl') {
					this.xy.c.l = (e.page.x - this.elXY.left);
					this.xy.c.w = (this.xy.c.r - this.xy.c.l);
				}

				if (yCan) {
					this.xy.c.h = (e.page.y - this.elXY.top - this.xy.c.t);
				}

				break;
		}

		this.cropper.setStyles({
			'top': this.xy.c.t + 'px',
			'left': this.xy.c.l + 'px',
			'width': this.xy.c.w + 'px',
			'height': this.xy.c.h + 'px'
		});

		this.cropWrap.setStyles({
			'width': (this.xy.c.w - 4) + 'px',
			'height': (this.xy.c.h - 4) + 'px'
		});

		this.clip = this.xy.c;
		this.clip.b = this.xy.c.t + this.xy.c.h;
		this.clip.r = this.xy.c.l + this.xy.c.w;

		this.setClip(this.clip);

		this.fireEvent('resizing');
	},

	stop: function(e) {
		this.resizeDirection = null;

		this.cropDragger.attach();

		this.wrapper.removeEvent('mousemove', this.sizing);

		this.wrapper.removeEvent('mouseup', this.stop);

		this.fireEvent('resizeComplete');
	}
});