function SmallTypeWriter(elmt) {
	this.elmt = elmt;
	this.selector = $(elmt);
	this.linesToDisplay = [
		'Welcome, Human',
		'Let us start coding'
	];
	this.firstDelay = 2000;
	this.typingDelay = 70;
	this.afterLineDelay = 1000;
}

SmallTypeWriter.prototype.typeIt = function(selector, text, n) {
	var that = this;
	if (n < (text.length)) {
		$(that.elmt + ' ' + selector).html(text.substring(0, n + 1));
		n++;
		setTimeout(function() {
			that.typeIt(selector, text, n);
		}, that.typingDelay);
	} else {
		$.event.trigger("SmallTypeWriter:linedisplayed");
	}
};

SmallTypeWriter.prototype.appendTypeWriterItem = function(...args) {
	switch (args.length) {
		case 0:
			this.selector.append(
				"<span class='typewriter-item'>"
			);
			break;
		case 1:
			this.selector.append(
				"<span class='typewriter-item' data-text='" + args[0] + "'>"
			);
			break;
		default:
			break;
	}
};

SmallTypeWriter.prototype.start = function() {
	var that = this;
	var i = 0;
	
	that.appendTypeWriterItem(that.linesToDisplay[i]);

	setTimeout(function() {
		that.typeIt('span.typewriter-item', that.linesToDisplay[i], 0);
	}, that.firstDelay);

	$(window).on('SmallTypeWriter:linedisplayed', function() {
		i++;

		if (i < that.linesToDisplay.length) {
			that.appendTypeWriterItem(that.linesToDisplay[i]);
			setTimeout(function() {
				that.typeIt('span.typewriter-item:last-child', that.linesToDisplay[i], 0);
			}, that.afterLineDelay);
		}
	});
};





function MediumTypeWriter(elmt) {
	this.elmt = elmt;
	this.selector = $(elmt);
	this.linesToDisplay = [
		'Finally working, Human',
		'Let us start coding',
		'Testing more words out',
		'Hopefully it works'
	];
	this.firstDelay = 2000;
	this.typingDelay = 70;
	this.afterLineDelay = 1000;
}

MediumTypeWriter.prototype.typeIt = function(selector, text, n) {
	var that = this;
	if (n < (text.length)) {
		$(that.elmt + ' ' + selector).html(text.substring(0, n + 1));
		n++;
		setTimeout(function() {
			that.typeIt(selector, text, n);
		}, that.typingDelay);
	} else {
		$.event.trigger("MediumTypeWriter:linedisplayed");
	}
};

MediumTypeWriter.prototype.appendTypeWriterItem = function(...args) {
	switch (args.length) {
		case 0:
			this.selector.append(
				"<span class='typewriter-item'>"
			);
			break;
		case 1:
			this.selector.append(
				"<span class='typewriter-item' data-text='" + args[0] + "'>"
			);
			break;
		default:
			break;
	}
};

MediumTypeWriter.prototype.start = function() {
	var that = this;
	var i = 0;
	
	that.appendTypeWriterItem(that.linesToDisplay[i]);

	setTimeout(function() {
		that.typeIt('span.typewriter-item', that.linesToDisplay[i], 0);
	}, that.firstDelay);

	$(window).on('MediumTypeWriter:linedisplayed', function() {
		i++;

		if (i < that.linesToDisplay.length) {
			that.appendTypeWriterItem(that.linesToDisplay[i]);
			setTimeout(function() {
				that.typeIt('span.typewriter-item:last-child', that.linesToDisplay[i], 0);
			}, that.afterLineDelay);
		}
	});
};

