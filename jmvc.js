function jmvc(reference) {
	if (jmvc.isWrapper(reference)) {
		return reference;
	}

	const wrapper = {
		reference,
		isJmvcWrapper: true,
		initializers: [],
		terminators: [],
		status: jmvc.statusEnum.NEW
	};

	for (const key in jmvc.factories) {
		jmvc.factories[key](wrapper);
	}

	return wrapper.initialize();
}

jmvc.isWrapper = wrapper => {
	if (Object.prototype.hasOwnProperty.call(wrapper, 'isJmvcWrapper') && wrapper.isJmvcWrapper) {
		return true;
	}

	return false;
};

jmvc.eventEnum = {
	INITIALIZE: 'initialized',
	TERMINATE: 'terminated',
	CHANGE: 'change',
	INDIRECT_CHANGE: 'indirect-change',
	RENDER: 'render',
	RENDER_ATTRIBUTES: 'render:attributes',
	RENDER_CHILDREN: 'render:children'
};

jmvc.statusEnum = {
	NEW: 'New',
	INITIALIZED: 'Initialized',
	TERMINATED: 'Terminated'
};

jmvc.factories = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// INSTANCE
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.factories.instance = (() => {
	function initialize() {
		if (this.status === jmvc.statusEnum.INITIALIZED) {
			return this;
		}

		const length = this.initializers.length;
		for (let index = 0; index < length; index++) {
			this.initializers[index](this);
		}

		this.status = jmvc.statusEnum.INITIALIZED;

		this.trigger(jmvc.eventEnum.INITIALIZE);

		return this;
	}

	function terminate() {
		if (this.status === jmvc.statusEnum.TERMINATED) {
			return this;
		}

		const length = this.terminators.length;
		for (let index = 0; index < length; index++) {
			this.terminators[index](this);
		}

		this.status = jmvc.statusEnum.TERMINATED;

		this.trigger(jmvc.eventEnum.TERMINATE);

		return this;
	}

	function callback(func) {
		func.call(this);

		return this;
	}

	return wrapper => {
		Object.assign(wrapper, {
			initialize,
			terminate,
			callback
		});
	};
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EVENT
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.factories.event = (() => {
	const terminator = wrapper => {
		wrapper.off();
	};

	function on(name, callback, once = false, context = this) {
		if (!this.events[name]) {
			this.events[name] = {
				callbacks: []
			};

			if (this.reference instanceof EventTarget) {
				const listener = {
					handleEvent: event => {
						this.trigger(name, event);
					}
				};
				this.reference.addEventListener(name, listener);
				this.events[name].listener = listener;
			}
		}

		this.events[name].callbacks.push({
			callback,
			once,
			context
		});

		return this;
	}

	function off(name, callback, once, context) {
		const next = name => {
			const callbacks = this.events[name].callbacks;

			let index = 0;
			while (index < callbacks.length) {
				if ((callback == null || callback === callbacks[index].callback)
					&& (once == null || once === callbacks[index].once)
					&& (context == null || context === callbacks[index].context)) {

					this.events[name].callbacks.splice(index, 1);

					continue;
				}

				index++;
			}

			if (callbacks.length === 0) {
				if (this.reference instanceof EventTarget) {
					this.reference.removeEventListener(name, this.events[name].listener);
				}

				delete this.events[name];
			}
		};

		if (name) {
			if (this.events[name]) {
				next(name);
			}
		} else {
			for (const key in this.events) {
				next(key);
			}
		}

		return this;
	}

	function trigger(name, ...args) {
		if (!this.events[name]) {
			return this;
		}

		const callbacks = this.events[name].callbacks;

		let index = 0;
		while (index < callbacks.length) {
			const { callback, once, context } = callbacks[index];

			if (context.status === jmvc.statusEnum.TERMINATED) {
				callbacks.splice(index, 1);
				continue;
			}

			callback.call(context, ...args);

			if (once) {
				callbacks.splice(index, 1);
				continue;
			}

			index++;
		}

		if (callbacks.length === 0) {
			if (this.reference instanceof EventTarget) {
				this.reference.removeEventListener(name, this.events[name].listener);
			}

			delete this.events[name];
		}

		return this;
	}

	function listenTo(context, name, callback, once) {
		context.on(name, callback, once, this);

		return this;
	}

	function stopListening(context, name, callback, once) {
		context.off(name, callback, once, this);

		return this;
	}

	return wrapper => {
		wrapper.terminators.push(terminator);

		Object.assign(wrapper, {
			events: {},
			on,
			off,
			trigger,
			listenTo,
			stopListening
		});
	};
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MODEL
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.isValidModel = reference => {
	if (reference == null || typeof reference !== 'object' || jmvc.isValidView(reference)) {
		return false;
	}

	return true;
};

jmvc.factories.model = (() => {
	const unmapOldValue = (wrapper, key) => {
		const value = wrapper.beforeChange[key];
		if (jmvc.isValidModel(value) && !(value in wrapper.reference)) {
			const jvalue = wrapper.relatedMap.get(value);
			if (jvalue) {
				wrapper.stopListening(jvalue, jmvc.eventEnum.CHANGE);
				wrapper.relatedMap.delete(value);
			}
		}
	};

	const mapNewValue = (wrapper, key) => {
		const value = wrapper.reference[key];
		if (jmvc.isValidModel(value) && !(wrapper.beforeChange && value in wrapper.beforeChange)) {
			const jvalue = jmvc(value);
			wrapper.listenTo(jvalue, jmvc.eventEnum.CHANGE, () => {
				wrapper.trigger(`${jmvc.eventEnum.INDIRECT_CHANGE}:${key}`);
				wrapper.trigger(jmvc.eventEnum.INDIRECT_CHANGE);
			});
			wrapper.relatedMap.set(value, jvalue);
		}
	};

	const mapValues = (wrapper, key) => {
		if (key) {
			if (wrapper.beforeChange) {
				unmapOldValue(wrapper, key);
			}

			mapNewValue(wrapper, key);
		} else {
			if (wrapper.beforeChange) {
				for (const key in wrapper.beforeChange) {
					unmapOldValue(wrapper, key);
				}
			}

			for (const key in wrapper.reference) {
				mapNewValue(wrapper, key);
			}
		}
	};

	const initializer = wrapper => {
		mapValues(wrapper);
	};

	function get(name) {
		return this.reference[name];
	}

	function getJmvc(name) {
		return this.relatedMap.get(this.get(name));
	}

	function set(name, value) {
		if (this.reference[name] !== value) {
			this.beforeChange = { ...this.reference };

			if (value === undefined) {
				delete this.reference[name];
			} else {
				this.reference[name] = value;
			}

			mapValues(this, name);

			this.trigger(`${jmvc.eventEnum.CHANGE}:${name}`);
			this.trigger(jmvc.eventEnum.CHANGE);
		}

		return this;
	}

	function unset(name) {
		return this.set(name);
	}

	const mutators = ['copyWithin', 'fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice']
		.reduce((acc, cur) => {
			acc[cur] = function (...args) {
				this.beforeChange = [...this.reference];

				Array.prototype[cur].call(this.reference, ...args);

				mapValues(this);

				if (this.beforeChange.length !== this.reference.length || !this.reference.every((cur, index) => cur === this.beforeChange[index])) {
					this.trigger(jmvc.eventEnum.CHANGE);
				}

				return this;
			};

			return acc;
		}, {});

	const nonMutators = ['concat', 'entries', 'every', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'indexOf'
		, 'join', 'keys', 'lastIndexOf', 'map', 'reduce', 'reduceRight', 'slice', 'some', 'toLocaleString', 'toString'
		, 'unshift', 'values']
		.reduce((acc, cur) => {
			acc[cur] = function (...args) {
				return Array.prototype[cur].call(this.reference, ...args);
			};

			return acc;
		}, {});

	return wrapper => {
		if (!jmvc.isValidModel(wrapper.reference)) {
			return;
		}

		wrapper.initializers.push(initializer);

		Object.assign(wrapper, {
			isJmvcModel: true,
			beforeChange: null,
			relatedMap: new Map(),
			get,
			getJmvc,
			set,
			unset
		});

		if (Array.isArray(wrapper.reference)) {
			Object.assign(wrapper, mutators, nonMutators, {
				isJmvcCollection: true,
			});
		}
	};
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VIEW
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.isValidView = reference => {
	if (!(reference instanceof HTMLElement)) {
		return false;
	}

	return true;
};

jmvc.isView = wrapper => {
	if (Object.prototype.hasOwnProperty.call(wrapper, 'isJmvcView') && wrapper.isJmvcView) {
		return true;
	}

	return false;
};

jmvc.factories.view = (() => {
	function initializer(wrapper) {
		if (wrapper.reference.hasAttributes()) {
			const attributes = {};
			const attributesList = wrapper.reference.attributes;
			const length = attributesList.length;

			if (length > 0) {
				for (let index = 0; index < length; index++) {
					const { name, value } = attributesList[index];
					attributes[name] = value;
				}

				wrapper.setAttributes(attributes);
			}
		}

		if (wrapper.reference.hasChildNodes()) {
			const children = [];
			const childNodes = wrapper.reference.childNodes;
			const length = childNodes.length;

			if (length > 0) {
				for (let index = 0; index < length; index++) {
					children.push(childNodes[index]);
				}

				wrapper.setChildren(children);
			}
		}
	}

	function terminator(wrapper) {
		const terminate = children => {
			if (!Array.isArray(children)) {
				children = [children];
			}

			const length = children.length;
			for (let index = 0; index < length; index++) {
				const child = children[index];
				if (Array.isArray(child)) {
					terminate(child);
				} else if (jmvc.isWrapper(child)) {
					child.terminate();
				}
			}
		};

		terminate(wrapper.children);
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

		if (callback) {
			callback(promises);
		}

		this.trigger(jmvc.eventEnum.RENDER_ATTRIBUTES, promises);

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

			if (children == null) {
				// DO NOTHING
			} else if (typeof children === 'boolean' || typeof children === 'number') {
				process(String(children), placeholder);
			} else if (typeof children === 'string') {
				insertChild(document.createTextNode(children), placeholder);
			} else if (children instanceof Node) {
				insertChild(children, placeholder);
			} else if (jmvc.isView(children)) {
				children.render(renderPromises => promises.push(...renderPromises));
				process(children.reference, placeholder);
			} else if (Array.isArray(children)) {
				const length = children.length;
				for (let index = 0; index < length; index++) {
					promises.push(...process(children[index]));
				}
			} else if (typeof children === 'function') {
				promises.push(...process(children.call(this), placeholder));
			} else if (children instanceof Promise) {
				const newPlaceholder = document.createElement('span');
				insertChild(newPlaceholder, placeholder);
				promises.push(children
					.then(children => Promise.all(process(children, newPlaceholder)))
					.then(() => this.reference.removeChild(newPlaceholder)));
			}

			return promises;
		};

		const promises = process(this.children);

		if (callback) {
			callback(promises);
		}

		this.trigger(jmvc.eventEnum.RENDER_CHILDREN, promises);

		return this;
	}

	function render(callback) {
		const promises = [];

		this.renderAttributes(renderPromises => promises.push(...renderPromises));
		this.renderChildren(renderPromises => promises.push(...renderPromises));

		if (callback) {
			callback(promises);
		}

		this.trigger(jmvc.eventEnum.RENDER, promises);

		return this;
	}

	function appendTo(target) {
		if (target.isJmvcWrapper) {
			target = target.reference;
		}

		target.append(this.reference);

		return this;
	}

	return wrapper => {
		if (!jmvc.isValidView(wrapper.reference)) {
			return;
		}

		wrapper.initializers.push(initializer);
		wrapper.terminators.push(terminator);

		Object.assign(wrapper, {
			isJmvcView: true,
			attributes: {},
			children: [],
			setAttributes,
			setChildren,
			renderAttributes,
			renderChildren,
			render,
			appendTo
		});
	};
})();

jmvc.view = tag => {
	return jmvc(document.createElement(tag));
};

jmvc.text = (...args) => {
	return document.createTextNode(args.join(''));
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.factories.style = (() => {
	function style(jmodel = jmvc({})) {
		jmodel = jmvc(jmodel)
			.on(jmvc.eventEnum.CHANGE, () => {
				this.render();
			})
			.on(jmvc.eventEnum.INDIRECT_CHANGE, () => {
				this.render();
			});

		this.setChildren([
			() => {
				const styles = jmodel.reference;
				return jmvc.text(...Object.keys(styles).reduce((acc, cur) => {
					acc.push(cur, '{');

					const style = styles[cur];
					for (const key in style) {
						acc.push(`${key}:${style[key]};`);
					}

					acc.push('}');

					return acc;
				}, []));
			}
		]);

		return this;
	}

	return wrapper => {
		if (!jmvc.isValidView(wrapper.reference) || !(wrapper.reference instanceof HTMLStyleElement)) {
			return;
		}

		Object.assign(wrapper, {
			style
		});
	};
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLOBAL
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

jmvc.global = (() => {
	const map = new Map();

	const global = reference => {
		let wrapper;
		if (jmvc.isWrapper(reference)) {
			wrapper = reference;
		} else {
			wrapper = map.get(reference) || jmvc(reference);
		}

		if (!map.has(wrapper.reference)) {
			map.set(wrapper.reference, wrapper);
		}

		return wrapper;
	};

	global.remove = reference => {
		if (reference) {
			if (map.has(reference)) {
				map.delete(reference);
			}
		} else {
			map.clear();
		}
	};

	return global;
})();
