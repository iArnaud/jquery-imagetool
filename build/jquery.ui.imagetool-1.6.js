(function($) {
	$.widget("ui.imagetool", {
		/**
		 * Public methods
		 */
		reset: function(options) {
			$.extend(this.options, options);
			this._setup();
		}
	
			/**
			 * Returns all options
			 */
		,properties: function() {
			return this.options;
		}
		

	,_init: function() {
		var self = this;
		var o = this.options;

		var image = this.element;
		image.css("display", "none");
		if(!o.src) {
			o.src = image.attr("src");
		}
		// Set up the viewport
		image.wrap("<div/>");

		self._setup();
	}
	

	/**
	 * Loads the image to get width/height
	 * Called when 
	 */
	,_setup: function() {
		var self = this;
		var o = this.options;
		var image = this.element;
		var i = new Image();
		i.onload = function() {
		  o.imageWidth = i.width;
		  o.imageHeight = i.height;
		  self._configure();
		  
		}
		i.src = o.src;
		
		

		if(o.src != image.attr("src")) {
			image.attr("src", o.src);
		}
	}

	,_configure: function() {
		var self = this;
		var o = this.options;
		var image = this.element;
		var viewport = image.closest("div");

		viewport.css({
			overflow: "hidden"
			,position: "relative" /* Needed by IE for some reason */
			,width: o.viewportWidth + "px"
			,height: o.viewportHeight + "px"
		});
		// Set the initial size of the image to the original size.
		o._width = o.imageWidth;
		o._height = o.imageHeight;

		// There is only one scale value. We don't stretch images.
		var scale = Math.max(o.viewportWidth/(o.w * o.imageWidth), o.viewportHeight/(o.h * o.imageHeight));

		o._width = o._width * scale;
		o._height = o._height * scale;

		o._oldWidth = o._width;
		o._oldHeight = o._height;

		/**
		 * Calculate absolute pixel values for the position of the image relative to the viewport.
		 */
		o._absx = -(o.x * o._width);
		o._absy = -(o.y * o._height);

		self._zoom();
		

		if(o.allowPan || o.allowZoom) {
			viewport.mousedown(function(e) {self._handleMouseDown(e);});
			viewport.mouseover(function(e) {self._handleMouseOver(e);});
			viewport.mouseout(function(e) {self._handleMouseOut(e);});
		}
		else {
			image.css("cursor", o.disabledCursor);
			viewport.mousedown(function(e) {
				e.preventDefault();
			});
		}
		image.css({position: "relative", display: "block"});
		self._trigger("ready", null, o);
	}
	/**
	 * Find the edge n, e, s, w, 
	 */
	,_getEdge: function(o, x, y) {
		var self = this;
		var image = this.element;

		var scale = o._width / o.imageWidth;


		var fromEdgdeE = o.viewportWidth - x;
		var fromEdgdeS = o.viewportHeight - y;

		// TODO: add edge sensitivity to options
		if(fromEdgdeE < o.edgeSensitivity && fromEdgdeS < o.edgeSensitivity && (o.allowResizeX || o.allowResizeY)) {
			return "se";
		}
		else if(fromEdgdeE < o.edgeSensitivity && o.allowResizeX) {
			return "e";
		}
		else if(fromEdgdeS < o.edgeSensitivity && o.allowResizeY) {
			return "s";
		}
	}

	,_handleMouseOver: function(event) {
		var self = this;
		var o = this.options;
		var image = this.element;
		var viewport = image.parent();
		viewport.css("cursor", o.cursor);		
		viewport.mousemove(function() {self._handleMouseMove(event);});

	}
	/**
	 * Sets the right cursor when the mouse moves off the image. 
	 */
	,_handleMouseOut: function(e) {
		var o = this.options;
		var image = this.element;
		image.css("cursor", o.cursor);
	}

	,_handleMouseMove: 	function(mmevt) {
		
		var self = this;
		var o = this.options;
		var image = this.element;
		var viewport = image.parent();

		
		var mouseX = (mmevt.pageX - viewport.offset().left);
		var mouseY = (mmevt.pageY - viewport.offset().top);

		
		var edge = self._getEdge(o, mouseX, mouseY);
		if(edge) {
			o.cursor = o["cursor-" + edge];
		}
		else {
			o.cursor = o.panCursor;
		}
		

		image.css("cursor", o.cursor);
	}

	,_handleMouseDown: function(mousedownEvent) {		
		mousedownEvent.preventDefault();

		var self = this;
		var o = this.options;
		var image = this.element;
		var viewport = image.parent();

		o.origoX = mousedownEvent.clientX;
		o.origoY = mousedownEvent.clientY;

		var mouseX = (mousedownEvent.pageX - viewport.offset().left);
		var mouseY = (mousedownEvent.pageY - viewport.offset().top);

		var edge = self._getEdge(o, mouseX, mouseY);

		if(edge) {
			$(document).mousemove(function(e) {
				self._handleViewPortResize(e, edge);
			});
		}
		else if(o.allowZoom && (mousedownEvent.shiftKey || mousedownEvent.ctrlKey) ) {
			o.cursor = o.zoomCursor;
			image.css("cursor", o.zoomCursor);
			$("body").css("cursor", o.zoomCursor);
			$(document).mousemove(function(e) {
				self._handleZoom(e);
			});
		}
		else if(o.allowPan) {
			o.cursor = o.panCursor;
			image.css("cursor", o.panCursor);
			$("body").css("cursor", o.panCursor);
			$(document).mousemove(function(e) {
				self._handlePan(e);
			});
		}

		$(document).mouseup(function() {
			o.cursor = o.panCursor;
			$("body").css("cursor", "default");
			image.css("cursor", o.cursor);
			viewport.unbind("mousemove").unbind("mouseup").unbind("mouseout");
			$(document).unbind("mousemove");
		});
		return false;
	}

	,_handleZoom: function(e) {
		e.preventDefault();
		var o = this.options;
		var self = this;

		var factor = (o.origoY - e.clientY);

		o._oldWidth = o._width;
		o._oldHeight = o._height;

		o._width = ((factor/100) * o._width) + o._width;
		o._height = ((factor/100) * o._height) + o._height;

		if(self._zoom()) {
			this._trigger("change", e, o);
			o.origoY = e.clientY;
		}
	}
	
	/**
	 * Handles resize of the viewport
	 */
	,_handleViewPortResize: function(e, edge) {
		e.preventDefault();
		var self = this;
		var image = this.element;
		var o = this.options;

		var deltaX = o.origoX - e.clientX;
		var deltaY = o.origoY - e.clientY;

		o.origoX = e.clientX;
		o.origoY = e.clientY;

		var targetWidth = o.viewportWidth;
		var targetHeight = o.viewportHeight;

		if(edge == "e" || edge == "se") {
			targetWidth = o.viewportWidth - deltaX;
		}
		if(edge == "s" || edge == "se") {
			targetHeight = o.viewportHeight - deltaY;
		}

		if(targetWidth > o.viewportMaxWidth) {
			o.viewportWidth = o.viewportMaxWidth;
		}
		else if(targetWidth < o.viewportMinWidth) {
			o.viewportWidth = o.viewportMinWidth;
		}
		else if(o.allowResizeX) {
			o.viewportWidth = targetWidth;
		}

		if(targetHeight > o.viewportMaxHeight) {
			o.viewportHeight = o.viewportMaxHeight;
		}
		else if(targetHeight < o.viewportMinHeight) {
			o.viewportHeight = o.viewportMinHeight;
		}
		else if(o.allowResizeY) {
			o.viewportHeight = targetHeight;
		}
		self._resize();

		
	}

	,_resize: function() {
		var self = this;
		var image = this.element;
		var o = this.options;
		
		image.parent().css({
			width: o.viewportWidth + "px"
			,height: o.viewportHeight + "px"
		});

		self._fit();
		this._trigger("change", null, o);
	}


	,_handlePan: function(e) {
		e.preventDefault();
		var self = this;
		var o = this.options;

		var deltaX = o.origoX - e.clientX;
		var deltaY = o.origoY - e.clientY;

		o.origoX = e.clientX;
		o.origoY = e.clientY;

		var targetX = o._absx - deltaX;
		var targetY = o._absy - deltaY;

		var minX = -o._width + o.viewportWidth;
		var minY = -o._height + o.viewportHeight;

		o._absx = targetX;
		o._absy = targetY;
		self._move();  

		
	} // end pan



	,_move: function() {
		var o = this.options;
		var image = this.element;

		var minX = -o._width + o.viewportWidth;
		var minY = -o._height + o.viewportHeight;

		if(o._absx > 0) {
			o._absx = 0;
		}
		else if(o._absx < minX) {
			o._absx = minX;
		}

		if(o._absy > 0) {
			o._absy = 0;
		}    
		else if(o._absy < minY) {
			o._absy = minY;
		}
		
		o.x = (-o._absx/o._width);
		o.y = (-o._absy/o._height);

		image.css({
			left: o._absx + "px"
			,top: o._absy + "px"
		});
		this._trigger("change", null, o);
	}





	/**
	 * Zooms the image by setting its width/height
	 * Makes sure the desired size greater or equal to the viewport size. 
	 */
	,_zoom: function() {
		var self = this;
		var image = this.element;
		var o = this.options;

		var wasZoomed = true;
		
		if(o._width < o.viewportWidth) {
			o._height = parseInt(o.imageHeight * (o.viewportWidth/o.imageWidth));
			o._width = o.viewportWidth;
			wasZoomed = false;
		}

		if(o._height < o.viewportHeight) {
			o._width = parseInt(o.imageWidth * (o.viewportHeight/o.imageHeight));
			o._height = o.viewportHeight;
			wasZoomed = false;
		}


		if(o._width > o.imageMaxWidth) {
			o._height = parseInt(o._height * (o.imageMaxWidth/o._width));
			o._width = o.imageMaxWidth;
			wasZoomed = false;
		}

		

		image.css({
			width: o._width + "px"
			,height: o._height + "px"
		});


		// Scale at center of viewport
		var cx = o._width /(-o._absx + (o.viewportWidth/2));
		var cy = o._height /(-o._absy + (o.viewportHeight/2));


		o._absx = o._absx - ((o._width - o._oldWidth) / cx);
		o._absy = o._absy - ((o._height - o._oldHeight) / cy);

		
		
		self._move();
		
		o.w = o.viewportWidth/o._width;
		o.h = o.viewportHeight/o._height;
		
		return wasZoomed;
	}


	/**
	 * Makes sure the image is not smaller than the viewport.
	 */
	,_fit: function() {
		var self = this;
		var image = this.element;
		var o = this.options;

		if(o.viewportWidth > o._width || o.viewportHeight > o._height) {
			var factor = o.viewportWidth / o._width;
			o._width = o.viewportWidth;
			o._height = o._height * factor;
			self._zoom();
		}
		self._move();
	}
});

	$.ui.imagetool.getter = "properties";
	$.extend($.ui.imagetool, {
		version: "@VERSION",
		defaults: {
			src: null /* The image src is used */
			,allowZoom: true
			,allowPan: true
			,allowResizeX: true
			,allowResizeY: true
			,zoomCursor: "crosshair"
			,panCursor: "move"
			,disabledCursor: "not-allowed"
			,viewportWidth: 400
			,viewportHeight: 300
			,viewportMinWidth: 100
			,viewportMinHeight: 80
			,viewportMaxWidth: 800
			,viewportMaxHeight: 800
			,"cursor-se":"se-resize"
			,"cursor-s":"s-resize"
			,"cursor-e":"e-resize"
			,edgeSensitivity: 15
			,imageWidth: 200 /* The width of the work image */
			,imageHeight: 200 /* The height of the work image */
			,imageMaxWidth: 2500
			,x: 0
			,y: 0
			,w: 1 
			,h: 1
			,ready: function() {}
			,change: function() {}
		}
	});
})(jQuery);