var registerCustomElement = require('@dojo/widget-core/registerCustomElement').default;

var defaultExport = widgetFactory.default;
var descriptor;

if (defaultExport && defaultExport.prototype && defaultExport.prototype.__customElementDescriptor) {
	descriptor = function() { return defaultExport.prototype.__customElementDescriptor };
}
else {
	try {
		if (defaultExport && typeof defaultExport().tagName === 'string') {
			descriptor = defaultExport;
		}
	} catch(error) {}
}

descriptor && registerCustomElement(descriptor);

