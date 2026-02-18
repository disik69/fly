(function($){

	/**
	 * Copyright 2012, Digital Fusion
	 * Licensed under the MIT license.
	 * http://teamdf.com/jquery-plugins/license/
	 *
	 * @author Sam Sehnert
	 * @desc A small plugin that checks whether elements are within
	 *		 the user visible viewport of a web browser.
	 *		 only accounts for vertical position, not horizontal.
	 */
	$.fn.visible = function(partial,hidden,border){
		var border = border || 0

	    var $t				= $(this).eq(0),
	    	t				= $t.get(0),
	    	$w				= $(window),
	    	viewTop			= $w.scrollTop(),
	    	viewBottom		= viewTop + $w.height(),
	    	_top			= $t.offset().top,
	    	_bottom			= _top + $t.height(),
	    	compareTop		= partial === true ? _bottom : _top,
	    	compareBottom	= partial === true ? _top : _bottom,

	    	viewLeft		= $w.scrollLeft(),
	    	viewRight		= viewLeft + $w.width(),
	    	_left			= $t.offset().left,
	    	_right			= _left + $t.width(),
	    	compareLeft		= partial === true ? _right : _left,
	    	compareRight	= partial === true ? _left : _right,

	    	clientSize		= hidden === true ? t.offsetWidth * t.offsetHeight : true;

		return !!clientSize && ((compareRight <= viewRight - border)
			&& (compareLeft >= viewLeft + border)
			&& (compareBottom <= viewBottom - border)
			&& (compareTop >= viewTop + border));
    };
    
})(jQuery);