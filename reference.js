function Reference(name, file, referencedFrom){
	'use strict';
	this.name = name;
	this.file = file;
	this.referencedFrom = referencedFrom;
}

module.exports = Reference;