function jmvc(reference, ...args) {
	let wrapper = jmvc.map.get(reference);

	if (wrapper == null) {
		wrapper = {
			reference,
			initializers: [],
			terminators: []
		};

		for (const key in jmvc.factories) {
			jmvc.factories[key].call(wrapper, reference, ...args);
		}

		wrapper.initialize(reference, ...args);
	}

	return wrapper;
}

jmvc.map = new Map();

jmvc.factories = {};

jmvc.isWrapper = function (wrapper) {
	return !(wrapper instanceof Node) && wrapper && typeof wrapper === 'object' && wrapper.reference;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// INSTANCE
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(factories => {
	function terminator() {
		if (jmvc.map.has(this.reference)) {
			jmvc.map.delete(this.reference);
		}
	}

	function initialize(reference, ...args) {
		for (let index = 0, length = this.initializers.length; index < length; index++) {
			this.initializers[index].call(this, reference, ...args);
		}

		this.trigger('initialize');

		return this;
	}

	function terminate(...args) {
		this.trigger('terminate');

		for (let index = 0, length = this.terminators.length; index < length; index++) {
			this.terminators[index].call(this, ...args);
		}

		return this;
	}

	function callback(func) {
		func.call(this);
		return this;
	}

	factories.instance = function (reference) {
		jmvc.map.set(reference, this);

		this.terminators.push(terminator);

		this.initialize = initialize;
		this.terminate = terminate;
		this.callback = callback;
	};
})(jmvc.factories);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EVENT
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(factories => {
	function terminator() {
		this.off();
	}

	function on(name, callback, once = false, context = this) {
		if (!this.events[name]) {
			this.events[name] = {
				callbacks: []
			};

			if (this.reference instanceof EventTarget) {
				const listener = {
					handleEvent: event => this.trigger(name, event)
				};
				this.reference.addEventListener(name, listener);
				this.events[name].listener = listener;
			}
		}

		this.events[name].callbacks.push({ callback, once, context });

		return this;
	}

	function off(name, callback, once, context) {
		function doAction(name) {
			let index = 0;

			const callbacks = this.events[name].callbacks;
			while (index < callbacks.length) {
				if (
					(callback == null || callback === callbacks[index].callback)
					&& (once == null || once === callbacks[index].once)
					&& (context == null || context === callbacks[index].context)
				) {
					this.events[name].callbacks.splice(index, 1);

					continue;
				}

				index++;
			}

			if (index === 0) {
				if (this.reference instanceof EventTarget) {
					this.reference.removeEventListener(name, this.events[name].listener);
				}
				delete this.events[name];
			}
		}

		if (name) {
			if (this.events[name]) {
				doAction(name);
			}
		} else {
			for (const key in this.events) {
				doAction(key);
			}
		}

		return this;
	}

	function trigger(name, ...args) {
		if (this.events[name]) {
			let index = 0;

			const callbacks = this.events[name].callbacks;
			while (index < callbacks.length) {
				const { callback, once, context } = callbacks[index];

				if (!jmvc.map.has(context.reference)) {
					this.events[name].callbacks.splice(index, 1);
					continue;
				}

				callback.call(context, ...args);

				if (once) {
					this.events[name].callbacks.splice(index, 1);
					continue;
				}

				index++;
			}

			if (index === 0) {
				if (this.reference instanceof EventTarget) {
					this.reference.removeEventListener(name, this.events[name].listener);
				}
				delete this.events[name];
			}
		}

		return this;
	}

	function listenTo(context, name, callback, once) {
		if (jmvc.map.has(context.reference)) {
			context.on(name, callback, once, this);
		}

		return this;
	}

	function stopListening(context, name, callback, once) {
		if (jmvc.map.has(context.reference)) {
			context.off(name, callback, once, this);
		}

		return this;
	}

	factories.event = function () {
		this.terminators.push(terminator);

		this.events = {};
		this.on = on;
		this.off = off;
		this.trigger = trigger;
		this.listenTo = listenTo;
		this.stopListening = stopListening;
	};
})(jmvc.factories);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MODEL
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(factories => {
	function get(name) {
		return this.reference[name];
	}

	function set(name, value) {
		if (this.reference[name] !== value) {
			this.reference[name] = value;

			this.trigger(`change:${name}`);
			this.trigger('change');
		}

		return this;
	}

	function unset(name) {
		if (this.reference[name] !== undefined) {
			delete this.reference[name];

			this.trigger(`change:${name}`);
			this.trigger('change');
		}

		return this;
	}

	factories.model = function (reference) {
		if (typeof reference !== 'object') {
			return;
		}

		this.get = get;
		this.set = set;
		this.unset = unset;
	};
})(jmvc.factories);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// COLLECTION
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(factories => {
	const mutatingMethods = ['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'].reduce((acc, cur) => {
		acc[cur] = function (...args) {
			const before = Array.prototype.slice.call(this.reference);

			Array.prototype[cur].call(this.reference, ...args);

			if (before.length !== this.reference.length || !this.reference.every((cur, index) => cur === before[index])) {
				this.trigger('change');
			}

			return this;
		};

		return acc;
	}, {});

	factories.collection = function (reference) {
		if (!Array.isArray(reference)) {
			return;
		}

		for (const key in mutatingMethods) {
			this[key] = mutatingMethods[key];
		}
	};
})(jmvc.factories);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VIEW
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(factories => {
	function terminator() {
		let children = this.children;
		if (!Array.isArray(children)) {
			children = [children];
		}

		for (let index = 0, length = children.length; index < length; index++) {
			const child = children[index];
			if (jmvc.isWrapper(child)) {
				child.terminate();
			}
		}
	}

	function setAttributes(attributes) {
		this.attributes = attributes;
		return this;
	}

	function setChildren(children) {
		this.children = children;
		return this;
	}

	function renderAttributes(callback) {
		const finalAttributes = {};

		const process = (attributes, key) => {
			const promises = [];

			if (typeof attributes === 'function') {
				promises.push(...process(attributes.call(this), key));
			} else if (attributes instanceof Promise) {
				promises.push(attributes.then(attributes => Promise.all(process(attributes, key))));
			} else if (attributes && typeof attributes === 'object') {
				for (const key in attributes) {
					promises.push(...process(attributes[key], key));
				}
			} else if (key != null && attributes != null) {
				finalAttributes[key] = attributes;
				this.reference.setAttribute(key, attributes);
			}

			return promises;
		};

		const promises = process(this.attributes);

		const cleanup = () => {
			const currentAttributes = {};

			const domAttributes = this.reference.attributes;
			for (let index = 0, length = domAttributes.length; index < length; index++) {
				const { name, value } = domAttributes[index];
				currentAttributes[name] = value;
			}

			for (const key in currentAttributes) {
				if (finalAttributes[key] == null) {
					this.reference.removeAttribute(key);
				}
			}
		};

		if (promises.length > 0) {
			Promise.all(promises).then(() => {
				cleanup();
			});
		} else {
			cleanup();
		}

		callback(promises);

		return this;
	}

	function renderChildren(callback) {
		while (this.reference.firstChild) {
			this.reference.removeChild(this.reference.lastChild);
		}

		const insertChild = (child, placeholder) => {
			if (placeholder) {
				this.reference.insertBefore(child, placeholder);
			} else {
				this.reference.append(child);
			}
		};

		const process = (children, placeholder) => {
			const promises = [];

			if (typeof children === 'function') {
				promises.push(...process(children.call(this), placeholder));
			} else if (children instanceof Promise) {
				const newPlaceholder = document.createElement('span');
				insertChild(newPlaceholder, placeholder);
				promises.push(children
					.then(children => Promise.all(process(children, newPlaceholder)))
					.then(() => this.reference.removeChild(newPlaceholder)));
			} else if (Array.isArray(children)) {
				for (let index = 0, length = children.length; index < length; index++) {
					promises.push(...process(children[index]));
				}
			} else if (jmvc.isWrapper(children)) {
				children.render(renderPromises => promises.push(...renderPromises));
				process(children.reference, placeholder);
			} else if (typeof children === 'boolean' || typeof children === 'number') {
				process(String(children), placeholder);
			} else if (children instanceof Node || typeof children === 'string') {
				insertChild(children, placeholder);
			} else if (children) {
				promises.push(...process([children]));
			}

			return promises;
		};

		const promises = process(this.children);
		callback(promises);

		return this;
	}

	function render(callback) {
		const promises = [];

		this.renderAttributes(renderPromises => promises.push(...renderPromises));
		this.renderChildren(renderPromises => promises.push(...renderPromises));

		if (callback) {
			callback(promises);
		}

		return this;
	}

	function appendTo(target) {
		if (jmvc.isWrapper(target)) {
			target = target.reference;
		}

		target.append(this.reference);

		return this;
	}

	factories.view = function (reference, attributes, children) {
		if (!(reference instanceof Node)) {
			return;
		}

		this.terminators.push(terminator);

		this.attributes = {};
		this.setAttributes = setAttributes;

		if (attributes || reference.hasAttributes()) {
			if (!attributes) {
				attributes = {};
				const attributesList = reference.attributes;
				for (let index = 0, length = attributesList.length; index < length; index++) {
					const { name, value } = attributesList[index];
					attributes[name] = value;
				}
			}

			this.setAttributes(attributes);
		}

		this.children = [];
		this.setChildren = setChildren;

		if (!children) {
			children = [];
			const childNodes = reference.childNodes;
			for (let index = 0, length = childNodes.length; index < length; index++) {
				children.push(childNodes[index]);
			}
		}
		if (children.length > 0) {
			this.setChildren(children);
		}

		this.renderAttributes = renderAttributes;
		this.renderChildren = renderChildren;
		this.render = render;

		this.appendTo = appendTo;
	};
})(jmvc.factories);

jmvc.view = function (tag, attributes, children) {
	return jmvc(document.createElement(tag), attributes, children);
};
