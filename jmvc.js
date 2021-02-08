/* exported jmvc */
function jmvc(context) {
	return Object.assign({
		context,
		retainCount: 0,
		events: {},
		listeningto: []
	}, jmvc.methods).on('terminate', function () {
		this.off();
		this.unlisten();
	});
}

jmvc.methods = {
	retain() {
		if (this.retainCount === 0) {
			this.trigger('initialize');
		}

		this.retainCount++;
		this.trigger('retain');

		return this;
	},

	release() {
		if (this.retainCount > 0) {
			this.retainCount--;
			this.trigger('release');
		}


		if (this.retainCount === 0) {
			this.trigger('terminate');
		}

		return this;
	},

	on(events, callback, once, listener) {
		events = events.split(' ');

		for (let index = 0, length = events.length; index < length; index++) {
			const event = events[index];

			if (this.events[event] == null) {
				this.events[event] = {
					callbacks: []
				};

				if (this.context instanceof EventTarget) {
					this.events[event].listener = (...args) => this.trigger(event, ...args);
					this.context.addEventListener(event, this.events[event].listener);
				}
			}

			this.events[event].callbacks.push({ callback, once, listener });
		}

		if (listener != null && listener.listeningto.indexOf(this) === -1) {
			listener.listeningto.push(this);
		}

		return this;
	},

	off(events, callback, once, listener) {
		if (events) {
			events = events.split(' ');
		} else {
			events = [];
			for (const key in this.events) {
				events.push(key);
			}
		}

		const listeners = [];

		for (let eventIndex = 0, eventLength = events.length; eventIndex < eventLength; eventIndex++) {
			const event = events[eventIndex];
			if (this.events[event] == null) {
				continue;
			}

			let callbackIndex = 0;
			while (callbackIndex < this.events[event].callbacks.length) {
				const callbackItem = this.events[event].callbacks[callbackIndex];
				if ((callback == null || callback === callbackItem.callback)
					&& (once == null || once === callbackItem.once)
					&& (listener == null || listener === callbackItem.listener)) {

					this.events[event].callbacks.splice(callbackIndex, 1);

					if (callbackItem.listener && listeners.indexOf(callbackItem.listener) === -1) {
						listeners.push(callbackItem.listener);
					}

					continue;
				}

				callbackIndex++;
			}

			if (callbackIndex === 0) {
				if (this.events[event].listener) {
					this.context.removeEventListener(event, this.events[event].listener);
				}

				delete this.events[event];
			}
		}

		listenersLoop:
		for (let listenerIndex = 0, listenerLength = listeners.length; listenerIndex < listenerLength; listenerIndex++) {
			const listener = listeners[listenerIndex];

			for (let eventIndex = 0, eventLength = this.events.length; eventIndex < eventLength; eventIndex++) {
				const event = this.events[eventIndex];

				for (let callbackIndex = 0, callbackLength = event.callbacks.length; callbackIndex < callbackLength; callbackIndex++) {
					const callback = event.callbacks[callbackIndex];

					if (callback.listener === listener) {
						continue listenersLoop;
					}
				}
			}

			const listeningtoIndex = listener.listeningto.indexOf(this);
			if (listeningtoIndex !== -1) {
				listener.listeningto.splice(listeningtoIndex, 1);
			}
		}

		return this;
	},

	trigger(events, ...args) {
		const eventArray = events.split(' ');

		let callbacks = [];

		for (let eventIndex = 0, eventLength = eventArray.length; eventIndex < eventLength; eventIndex++) {
			const event = eventArray[eventIndex];
			if (this.events[event] == null) {
				continue;
			}

			for (let callbackIndex = 0, callbackLength = this.events[event].callbacks.length; callbackIndex < callbackLength; callbackIndex++) {
				const callback = this.events[event].callbacks[callbackIndex].callback;
				if (callbacks.indexOf(callback) === -1) {
					callbacks.push(callback);
				}
			}
		}

		for (let index = 0, length = callbacks.length; index < length; index++) {
			callbacks[index].call(this, ...args);
		}

		this.off(events, null, true);

		return this;
	},

	listen(listenTo, events, callback, once) {
		listenTo.on(events, callback, once, this);
		return this;
	},

	unlisten(listenTo, events, callback, once) {
		const emitters = [];
		if (listenTo == null) {
			emitters.push(...this.listeningto);
		} else {
			emitters.push(listenTo);
		}

		for (let index = 0, length = emitters.length; index < length; index++) {
			emitters[index].off(events, callback, once, this);
		}

		return this;
	},

	callback(callback) {
		callback.call(this);
		return this;
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MODEL
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.model = function (model = {}) {
	return Object.assign(jmvc(model), {
		models: {}
	}, jmvc.model.methods).on('initialize', function () {
		for (const property in this.context) {
			this.setModelProperty(property);
		}
	}).on('terminate', function () {
		for (const property in this.models) {
			this.unsetModelProperty(property);
		}
	});
};

jmvc.model.methods = {
	setModelProperty(property) {
		const value = this.context[property];
		if (value != null && typeof value === 'object') {
			let model;
			if (Object.prototype.hasOwnProperty.call(value, 'retain')) {
				model = value;
			} else if (Array.isArray(value)) {
				model = jmvc.model.collection(value);
			} else {
				model = jmvc.model(value);
			}

			this.listen(model, 'change', () => this.trigger('change'));
			this.models[property] = model.retain();
		}

		return this;
	},

	unsetModelProperty(property) {
		if (this.models[property] != null) {
			this.unlisten(this.models[property], 'change');
			this.models[property].release();

			delete this.models[property];
		}

		return this;
	},

	get(property) {
		if (this.models[property] == null) {
			return this.context[property];
		}

		return this.models[property];
	},

	set(property, value) {
		this.unsetModelProperty(property);

		if (value === undefined) {
			delete this.context[property];
		} else {
			this.context[property] = value;
		}

		this.setModelProperty(property);

		this.trigger(`change:${property}`);
		this.trigger('change');

		return this;
	},

	unset(property) {
		return this.set(property);
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// COLLECTION
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.model.collection = function (collection = []) {
	return Object(jmvc.model(collection), jmvc.model.collection.methods);
};

jmvc.model.collection.methods = {
	mutateWith(mutator, ...args) {
		Array.prototype[mutator].call(this.context, ...args);

		const cleanModels = {};
		for (const property in this.models) {
			const model = this.models[property];
			const newProperty = this.context.indexOf(model.context);
			if (newProperty === -1) {
				this.unsetModelProperty(property);
			} else {
				cleanModels[newProperty] = model;
			}
		}
		this.models = cleanModels;

		for (let index = 0, length = this.context.length; index < length; index++) {
			if (!(index in this.models)) {
				this.setModelProperty(index);
			}
		}

		this.trigger('change');

		return this;
	},

	copyWithin(...args) {
		this.mutateWith('copyWithin', ...args);
	},

	fill(...args) {
		this.mutateWith('copyWithin', ...args);
	},

	pop(...args) {
		this.mutateWith('copyWithin', ...args);
	},

	push(...args) {
		this.mutateWith('push', ...args);
	},

	reverse(...args) {
		this.mutateWith('reverse', ...args);
	},

	shift(...args) {
		this.mutateWith('shift', ...args);
	},

	sort(...args) {
		this.mutateWith('sort', ...args);
	},

	splice(...args) {
		this.mutateWith('splice', ...args);
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VIEW
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.view = function (view = 'div') {
	if (typeof view === 'string') {
		view = document.createElement(view);
	}

	return Object.assign(jmvc(view), {
		attributes: {},
		children: []
	}, jmvc.view.methods).on('terminate', function () {
		this.setChildren([]);
	}).callback(function () {
		if (this.context.hasAttributes()) {
			const attributes = {};
			for (let index = 0, length = this.context.attributes.length; index < length; index++) {
				const { name, value } = this.context.attributes[index];
				attributes[name] = value;
			}
			this.setAttributes(attributes);
		}

		if (this.context.hasChildNodes()) {
			const children = [];
			for (let index = 0, length = this.context.childNodes.length; index < length; index++) {
				children.push(this.context.childNodes[index]);
			}
			this.setChildren(children);
		}
	});
};

jmvc.view.methods = {
	setAttributes(attributes) {
		this.attributes = attributes;

		this.trigger('change:attributes');
		this.trigger('change');

		return this;
	},

	setChildren(children) {
		for (let index = 0, length = this.children.length; index < length; index++) {
			const child = this.children[index];
			if (Object.prototype.hasOwnProperty.call(child, 'release')) {
				child.release();
			}
		}

		this.children = children;
		for (let index = 0, length = this.children.length; index < length; index++) {
			const child = this.children[index];
			if (Object.prototype.hasOwnProperty.call(child, 'retain')) {
				child.retain();
			}
		}

		this.trigger('change:children');
		this.trigger('change');

		return this;
	},

	renderAttributes(callback) {
		const processedAttributes = {};

		const process = (attributes, key) => {
			if (attributes == null) {
				return [];
			}

			if (typeof attributes === 'function') {
				return process(attributes.call(this), key);
			}

			if (attributes instanceof Promise) {
				return [
					attributes.then((attributes) => process(attributes, key))
				];
			}

			if (typeof attributes === 'object') {
				const promises = [];
				for (const key in attributes) {
					promises.push(...process(attributes[key], key));
				}
				return promises;
			}

			if (key != null) {
				processedAttributes[key] = attributes;
				this.context.setAttribute(key, attributes);
				return [];
			}

			return [];
		};

		const promises = process(this.attributes);

		const cleanup = () => {
			const currentAttributes = {};

			for (let index = 0, length = this.context.attributes.length; index < length; index++) {
				const { name, value } = this.context.attributes[index];
				currentAttributes[name] = value;
			}

			for (const key in currentAttributes) {
				if (!(key in processedAttributes)) {
					this.context.removeAttribute(key);
				}
			}
		};

		if (promises.length > 0) {
			Promise.all(promises).then(() => cleanup());
		} else {
			cleanup();
		}

		if (callback) {
			callback(promises);
		}

		this.trigger('render:attributes', promises);
		return this;
	},

	renderChildren(callback) {
		while (this.context.firstChild) {
			this.context.removeChild(this.context.lastChild);
		}

		const insertChild = (child, placeholder) => {
			if (placeholder) {
				this.context.insertBefore(child, placeholder);
			} else {
				this.context.append(child);
			}
		};

		const process = (children, placeholder) => {
			if (children == null) {
				return [];
			}

			if (typeof children === 'boolean' || typeof children === 'number') {
				return process(String(children), placeholder);
			}

			if (typeof children === 'string') {
				insertChild(document.createTextNode(children), placeholder);
				return [];
			}

			if (children instanceof Node) {
				insertChild(children, placeholder);
				return [];
			}

			if (Object.prototype.hasOwnProperty.call(children, 'render')) {
				const promises = [];
				children.render((renderPromises) => promises.push(...renderPromises));
				promises.push(...process(children.context, placeholder));
				return promises;
			}

			if (Array.isArray(children)) {
				const promises = [];
				for (let index = 0, length = children.length; index < length; index++) {
					promises.push(...process(children[index], placeholder));
				}
				return promises;
			}

			if (typeof children === 'function') {
				return process(children.call(this), placeholder);
			}

			if (children instanceof Promise) {
				const newPlaceholder = document.createElement('span');
				insertChild(newPlaceholder, placeholder);
				return [
					children
						.then((children) => Promise.all(process(children, newPlaceholder)))
						.then(() => this.context.removeChild(newPlaceholder))
				];
			}

			return [];
		};

		const promises = process(this.children);

		if (callback) {
			callback(promises);
		}

		this.trigger('render:children', promises);
		return this;
	},

	render(callback) {
		const promises = [];

		this.renderAttributes((renderPromises) => promises.push(...renderPromises));
		this.renderChildren((renderPromises) => promises.push(...renderPromises));

		if (callback) {
			callback(promises);
		}

		this.trigger('render', promises);
		return this;
	},

	appendTo(target) {
		if (Object.prototype.hasOwnProperty.call(target, 'context')) {
			target = target.context;
		}

		target.append(this.context);

		return this;
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MODEL-VIEW
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.view.modelview = function (view, model) {
	return Object.assign(jmvc.view(view), {
		model: null
	}, jmvc.view.modelview.methods).on('terminate', function () {
		this.setModel();
	}).callback(function () {
		this.setModel(model);
	});
};

jmvc.view.modelview.methods = {
	setModel(model, listenEvent = 'change') {
		if (this.model) {
			this.unlisten(this.model);
			this.model.release();
			this.model = null;
		}

		if (model) {
			this.model = model.retain();
			this.listen(this.model, listenEvent, () => {
				this.render();
			});
		}

		return this;
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// STYLE MODEL-VIEW
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.view.modelview.style = function (model) {
	return jmvc.view.modelview('style', model).callback(function () {
		this
			.setChildren(() => {
				return Object.keys(this.model.context).reduce((acc, cur) => {
					acc.push(cur, '{');

					const style = this.model.context[cur];
					for (const key in style) {
						acc.push(`${key}:${style[key]};`);
					}

					acc.push('}');

					return acc;
				}, []);
			})
			.appendTo(document.head);
	});
};
