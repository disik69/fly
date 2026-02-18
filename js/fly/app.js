(function($) {
	debug = false
	var getRandomArrayElement = function(arr) {
		return arr[Math.floor(Math.random() * arr.length)]
	}

	var getRandomPointOnTheBorderOfScreen = function(){
		var _left = $(window).scrollLeft()
		,	_right = _left + $(window).width() - 60
		,	_top = $(window).scrollTop()
		,	_bottom = _top + $(window).height() - 60
		var randomVerticalPoint = _top + Math.random()*(_bottom - _top)
		var randomHorizontalPoint = _left + Math.random()*(_right - _left)
		var offset = [
			[_left, randomVerticalPoint],
			[_right, randomVerticalPoint],
			[randomHorizontalPoint, _top],
			[randomHorizontalPoint, _bottom]
		]
		var side = getRandomArrayElement(offset)
		return {
			left: side[0],
			top: side[1]
		}
	}

	var isDotInDiv = function(x,y,div) {
		var divOffset = $(div).offset()
		return x >= divOffset.left && x <= divOffset.left + div.width()
				&& y >= divOffset.top && y <= divOffset.top + div.height()
	}

	var isInDirectView = function(target, flyX, flyY, angle, distance, step) {
		var step = step || 5
		var distance = distance || 500
		var incX = Math.cos(angle)*step
		var incY = -Math.sin(angle)*step
		// console.log(angle, incX, incY, '---------')
		for (var i = 0; i < distance; i += step) {
			flyX += incX
			flyY += incY
			if (isDotInDiv(flyX, flyY, target)) {
				return true
			}
		}
		return false
	}

	var getCenterPosition = function(el) {
		var offset = $(el).offset()
		offset.top += $(el).height()/2
		offset.left += $(el).width()/2
		return offset
	}

	var range = function(a, b, step) {
	    var A= [];
	    A[0]= a;
	    step= step || 1;
	    while(a+step<= b){
	        A[A.length]= a+= step;
	    }
		return A;
	}

	var normalizeAngle = function(angle) {
		if (angle > Math.PI) {
			return normalizeAngle(angle - 2*Math.PI)
		}
		if (angle < -Math.PI) {
			return normalizeAngle(angle + 2*Math.PI)
		}
		else {
			return angle
		}
	}

	var Transformable = function(element) {
		$.extend(this, $(element))
		return this
	}

	Transformable.prototype.getMatrix = function() {
		var transformProperty = this.css("transform")
		return transformProperty !== 'none'
			? transformProperty
				.split("(")[1]
				.split(")")[0]
				.split(",")
				.map(function(x) {
					return parseFloat(x)
				})
			: [1,0,0,1,0,0]
	}

	Transformable.prototype.setMatrix = function(matrix) {
		this.css("transform", "matrix(" + matrix.join(",") + ")")
		return this
	}

	Transformable.prototype.getAngle = function() {
		var m = this.getMatrix()
		return Math.atan2(m[1], m[0])
	}

	Transformable.prototype.rotate = function(angle) {
		var sin = Math.sin(angle)
		var cos = Math.cos(angle)
		var A = [cos, -sin, sin, cos]
		var B = this.getMatrix()
		var rotatedMatrix = [
			A[0]*B[0] + A[2]*B[1],
			A[1]*B[0] + A[3]*B[1],
			A[0]*B[2] + A[2]*B[3],
			A[1]*B[2] + A[3]*B[3],
			B[4],
			B[5]
		]
		this.setMatrix(rotatedMatrix)
		return this
	}

	Transformable.prototype.move = function(direct, side) {
		var direct = direct || 0
		var side = side || 0
		var matrix = this.getMatrix()

		var angle = this.getAngle()
		var sin = Math.sin(angle)
		var cos = Math.cos(angle)
		matrix[4] += direct*cos + side*sin
		matrix[5] += direct*sin + side*cos
		this.setMatrix(matrix)
		return this
	}

	Transformable.prototype.getCenterPosition = function() {
		var matrix = this.getMatrix()
		return {
			left: matrix[4] + this.width()/2,
			top: matrix[5] + this.height()/2
		}
	}

	Transformable.prototype.setOffset = function(offset) {
		var matrix = this.getMatrix()
		matrix[4] = offset.left
		matrix[5] = offset.top
		this.setMatrix(matrix)
		return this
	}

	var getRandom = function(e, d) {
		return Math.random()*2*d + e - d
	}


	var Fly = function(modelUrl) {
		var that = this
		this.isReady = false

		this.view = new FlyView
		scion.urlToModel(modelUrl, function(err, model) {
			if(err) throw err
			that.model = new scion.SCXML(model)
			that.model.registerListener({
				onEntry: function(stateId) {
					var allStates = stateId.split(".")
					var realState = allStates[allStates.length - 1]
					that.view._stop()
					var stateHandler = that.view[realState]
					if ($.isFunction(stateHandler)) {
						if (debug == true) console.log("entered " + stateId)
						that.view[realState](true)
					}
					else {
						if (debug == true) console.log("unknown state: " + stateId + "(" + realState + ")")
					}
				}
			})
			that.view.sendToModel = function(event) {
				if (debug == true) console.log("sending event [" + event + "]")
				that.model.gen(event)
			}
			that.isReady = true
			if (that.readyCB) {
				that.readyCB(that)
			}
		})	
	}

	Fly.prototype.ready = function(readyCB) {
		if (this.isReady) {
			readyCB(this)
		} else {
			this.readyCB = readyCB
		}
		return this
	}

	Fly.prototype.start = function(shit, shitClassName) {
		this.view.allShit = $(shit)
		this.view.shitClassName = shitClassName
		this.model.start()
	}

	Fly.prototype.stop = function() {
		this.view._stop()
		this.model.gen("stop")
	}

	Fly.prototype.updateShit = function(method, selector) {
		var selector = $(selector)
		switch (method) {
			case 'add':
				this.view.allShit = this.view.allShit.add(selector)
				break
			case 'delete': 
				this.view.allShit = this.view.allShit.not(selector)
				break
			case 'reset': 
				this.view.allShit = selector
				break
		}
		return this.view.allShit
	}

	var FlyView = function() {
		var jq = $("<div>").addClass("fly")
		this.jq = new Transformable(jq)
		this.jq.appendTo("body")
	}

	$.extend(FlyView.prototype, {
		ROW_LENGHT: 11,
		PIC_WIDTH: 40,
		PIC_HEIGHT: 40,
		PIC_DIAMETER: 40*Math.sqrt(2),
		VIEW_DISTANCE: 100
	})


	Object.defineProperty( FlyView.prototype, 'shitStatus', {
		_shitStatus: 'shitLost',
		get: function() { return this._shitStatus },
		set: function(value) {
			if (value !== this._shitStatus) {
				this._shitStatus = value
				this.sendToModel(value)
			}
		}
	})

	Object.defineProperty( FlyView.prototype, 'shitStatus2', {
		_shitStatus2: 'outShit',
		get: function() { return this._shitStatus2 },
		set: function(value) {
			if (value !== this._shitStatus2) {
				this._shitStatus2 = value
				this.sendToModel(value)
				if (this.shitClassName) {
					value == 'outShit'
						? this.shit.removeClass(this.shitClassName)
						: this.shit.addClass(this.shitClassName)
				}
			}
		}
	})

	Object.defineProperty( FlyView.prototype, 'flyStatus', {
		_flyStatus: 'onScreen',
		get: function() { return this._flyStatus },
		set: function(value) {
			if (value !== this._flyStatus) {
				this._flyStatus = value
				this.sendToModel(value)
			}
		}
	})

	FlyView.prototype._sees = function(target, angle, distance) {
		var distance	= distance	|| this.VIEW_DISTANCE
		,	angle 		= angle 	|| Math.PI - this.jq.getAngle()
		var flyPosition	= this.jq.getCenterPosition()
		,	flyX 		= flyPosition.left
		,	flyY		= flyPosition.top
		return isInDirectView(target, flyX, flyY, angle, this.VIEW_DISTANCE, 5)
	}

	FlyView.prototype._angleToPoint = function(pointX, pointY) {
		var flyOffset = this.jq.getCenterPosition()
		var angleToShit = Math.atan2(flyOffset.top - pointY, flyOffset.left - pointX)
		return normalizeAngle(this.jq.getAngle() - angleToShit)
	}

	FlyView.prototype._play = function(options) {
		var i = 0
		var that = this
		this.animationCycle = setInterval(function() {
			//rotate
			if (options.deltaDirectionE) {
				var moveDeltaDirection
				if (options.deltaDirectionD) {
					moveDeltaDirection = getRandom(options.deltaDirectionE, options.deltaDirectionD)
				}
				else {
					moveDeltaDirection = options.deltaDirectionE
				}
				that.jq.rotate(moveDeltaDirection)
			}
			//move
			if (options.deltaPosition) {
				that.jq.move(-that.PIC_WIDTH * options.deltaPosition)
				that._updateStatuses()
			}

			//showNextFrame
			if (options.shuffle == true) {
				var frame = getRandomArrayElement(options.frames)
				that._showFrame(frame)
				i++
			}
			else {
				that._showFrame(options.frames[i++])
			}


			if ($.isFunction(options.continueCallback)) {
				options.continueCallback()
			}

			
			if (i >= options.frames.length - 1) {
				if (options.cycled == true) {
					if (options.thereAndBack) {
						options.frames = options.frames.reverse()
					}
					i = 0
				}
				else {
					that._stop()
					if ($.isFunction(options.endCallback)) {
						options.endCallback()
					}
				}
			}
		}, options.frameTime)
	}

	FlyView.prototype._updateStatuses = function() {
		this.flyStatus =  this.jq.visible(null, null, this.PIC_DIAMETER * .4) ? "onScreen" : "outScreen"
		var p = this.jq.getCenterPosition()
		this.shitStatus2 = isDotInDiv(p.left, p.top, this.shit) ? "inShit" : "outShit"
		if (this.shitStatus2 == "outShit") {
			this.shitStatus = this._sees(this.shit) ? "shitFound" : "shitLost"
		}
		else {
			this.shitStatus = "shitFound"
		}
	}

	FlyView.prototype._stop = function() {
		clearInterval(this.animationCycle)
	}

	FlyView.prototype.startApplause = function() {
		var that = this
		this._play({
			frames: range(0,7),
			frameTime: 20,
			cycled: false,
			endCallback: function() {
				that.sendToModel("continue")
			}
		})
	}

	FlyView.prototype.continueApplause = function() {
		this._play({
			frames: range(8, 30),
			frameTime: 40,
			cycled: true
		})
	}

	FlyView.prototype.endApplause = function() {
		var that = this
		this._play({
			frames: range(31, 36),
			frameTime: 20,
			cycled: false,
			endCallback: function() {
				that.sendToModel("continue")
			}
		})
	}

	FlyView.prototype.startEating = function() {
		var that = this
		this._play({
			frames: range(62,65),
			frameTime: 40,
			cycled: false,
			endCallback: function() {
				that.sendToModel("continue")
			}
		})
	}

	FlyView.prototype.endEating = function() {
		var that = this
		this._play({
			frames: range(65, 68),
			frameTime: 40,
			cycled: false,
			endCallback: function() {
				that.sendToModel("continue")
			}
		})
	}

	FlyView.prototype.applauseLeg = function() {
		var that = this
		this._play({
			frames: range(78, 99),
			frameTime: 40,
			cycled: false,
			endCallback: function() {
				that.sendToModel("continue")
			}
		})
	}

	FlyView.prototype.twist = function() {
		var that = this
		this._play({
			frames: range(68, 78),
			frameTime: 40,
			cycled: false,
			endCallback: function() {
				that.sendToModel("continue")
			}
		})
	}

	FlyView.prototype.lookAround = function() {
		this._play({
			frames: range(36,51),
			frameTime: 100,
			cycled: true,
			thereAndBack: true
		})
	}

	// FlyView.prototype.lookingFor = function() {
	// 	this.lookingForDirection = Math.random() > .5 ? 1 : -1
	// }

	FlyView.prototype.lookPart = function() {
		var that = this
		var top = this.shit.offset().top
		var left = this.shit.offset().left
		var right = this.shit.width() + left
		var bottom = this.shit.height() + top
		var anglesToShitEdges = [
			[left, top],
			[right, top],
			[right, bottom],
			[left, bottom]
		].map(function(pointOffset) {
			return that._angleToPoint(pointOffset[0], pointOffset[1])	
		})
		var bestAngle = Number.POSITIVE_INFINITY
		anglesToShitEdges.forEach(function(angle) {
			if (Math.abs(angle) < Math.abs(bestAngle)) {
				bestAngle = angle
			}
		})
		this.jq.rotate(getRandom(bestAngle * .6, .4))
		this._play({
			frames: range(52, 61),
			frameTime: 10,
			deltaDirectionE: getRandom(.2 * bestAngle, .04),
			deltaDirectionD: .05,
			deltaPosition: .07
		})
	}

	FlyView.prototype.go = function(cycled) {
		this.jq.rotate(getRandom(0, .4))
		this._play({
			frames: range(52, 61),
			frameTime: 10,
			cycled: cycled,
			thereAndBack: true,
			deltaDirectionE: getRandom(0, .02),
			deltaDirectionD: .04,
			deltaPosition: .1
		})
	}


	// FlyView.prototype.spurt = function() {
	// 	// var target = 
	// 	this.jq.rotate(getRandom(0, 1))
	// 	this._play({
	// 		frames: range(96,103),
	// 		frameTime: 1,
	// 		cycled: true,
	// 		deltaDirectionE: getRandom(0, .02),
	// 		deltaDirectionD: .04,
	// 		deltaPosition: .2
	// 	})
	// }

	FlyView.prototype.flyAway = function() {
		var that = this
		this._play({
			// frames: range(96,103),
			// frames: [111, 108, 110],
			frames: [100],
			frameTime: 5,
			// shuffle: true,
			cycled: true,
			// thereAndBack: true,
			deltaDirectionE: getRandom(0, .02),
			deltaDirectionD: .06,
			deltaPosition: .8,
			continueCallback: function() {
				if (that.flyStatus == "outScreen") {
					// console.log(that.jq.getCenterPosition())
					that.sendToModel("die")
				}
			}
		})
	}

	FlyView.prototype.flyToShit = function() {
		var that = this
		// var shitPosition = getCenterPosition(this.shit)
		var shitPosition = this.landingTarget
		var deltaAngle = normalizeAngle(this._angleToPoint(shitPosition.left, shitPosition.top))
		// console.log("∠" + normalizeAngle(deltaAngle), deltaAngle, this.jq.getAngle(), angleToShit)
		this._play({
			// frames: range(96,103),
			frames: [100],
			frameTime: 5,
			deltaDirectionE: getRandom(deltaAngle/40, .01),
			deltaDirectionD: .03,
			deltaPosition: 1,
			endCallback: function() {
				// if (that._sees(that.shit, null, getRandom(50, 30))) {
				var pos = that.jq.getCenterPosition()
				if (isDotInDiv(pos.left, pos.top, that.shit)) {
					that.sendToModel("landing")
					// fly.stop()
				}
				else {
					that.sendToModel("continue")
				}
			}
		})
	}

	FlyView.prototype.nonexistance = function() {
		this.jq.hide()

		// ниже костыль
		var m = this.jq.getMatrix()
		m[5] = -100
		this.jq.setMatrix(m)
		var that = this
		setTimeout(function() {
			that._updateStatuses()
		}, 50)
	}


	// FlyView.prototype.landing = function() {
	// 	var that = this
	// 	this._play({
	// 		// frames: range(97,120),
	// 		frames: [97, 100, 103, 106, 109, 112, 115, 118],
	// 		frameTime: 50,
	// 		deltaDirectionE: getRandom(0, .02),
	// 		deltaDirectionD: .04,
	// 		deltaPosition: .2,
	// 		endCallback: function() {
	// 			that.sendToModel("continue")
	// 		}
	// 	})
	// }

	// FlyView.prototype.launch = function() {
	// 	var that = this
	// 	this._play({
	// 		frames:  [97, 100, 103, 106, 109, 112, 115, 118].reverse(),
	// 		frameTime: 50,
	// 		deltaDirectionE: getRandom(0, .2),
	// 		deltaDirectionD: .04,
	// 		deltaPosition: .2,
	// 		endCallback: function() {
	// 			that.sendToModel("continue")
	// 		}
	// 	})
	// }

	FlyView.prototype.hunting = function() {
		var that = this
		var visibleShit = this.allShit
			.filter(":visible")
			.filter(function(i, shit) {
				return $(shit).visible(true)
			})
		if (visibleShit.length > 0) {
			this.shit = $(getRandomArrayElement(visibleShit))
			var sOffset = this.shit.offset()
			,	sWidth = this.shit.width()
			,	sHeight = this.shit.height()

			this.landingTarget = {
				left: getRandom(sOffset.left + sWidth/2, sWidth * .4),
				top: getRandom(sOffset.top + sHeight/2, sHeight * .4)
			}

			// console.log(this.landingTarget, sWidth, sHeight, sOffset)

			var rp = getRandomPointOnTheBorderOfScreen()
			this.jq.setOffset(rp)

			// var shitPosition = getCenterPosition(this.shit)
			var deltaAngle = normalizeAngle(this._angleToPoint(this.landingTarget.left, this.landingTarget.top))
			this.jq.rotate(deltaAngle)
			setTimeout(function() { //костыль
				that.jq.show()
				that.sendToModel('continue')
			}, 10)
		}
	}

	FlyView.prototype._showFrame = function(number) {
		// var column = number % this.ROW_LENGHT
		// var row = (number - column)/this.ROW_LENGHT
		// var offsetX = -(column * this.PIC_WIDTH)
		// var offsetY = -(row * this.PIC_HEIGHT)
		// this.jq.css('background-position', offsetX + 'px ' + offsetY + 'px')
		this.jq.css('background-position', '0 -' + number*this.PIC_HEIGHT + 'px')
	}

	var FlyModel = function(model) {
		$.extend(this, new scion.SCXML(model))
	}

	$.fn.extend({
		callFly: function(options) {
			if (Modernizr.csstransforms
			&&	typeof Object.defineProperty == 'function'
			&&	typeof Array.prototype.map == 'function') {
				options = $.extend({
					number: 1,
					behaviorModelUrl: "behaviorModel.scxml",
					shitClassName: undefined
				}, options)
				var that = this
				var flies = []
				while (options.number-- > 0) {
					flies.push(new Fly(options.behaviorModelUrl).ready(function(fly) {
						fly.start($(that), options.shitClassName)
					}))
				}
				return flies
			}
			else {
				if (typeof console == 'object'
				&&	typeof console.log == 'function') {
					console.log("your browser is too old for flies")
				}
			}
		}
	})

	// var i = 0
	// while (i++ < 100) {
	// 	console.log(getRandomPointOnTheBorderOfScreen())
	// }


})(jQuery)