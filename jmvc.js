const Jmvc = function (context, callback) {
	if (!(this instanceof Jmvc)) {
		return new Jmvc(context);
	}

	this.context = context;
	this.retainCount = 0;
	this.events = {};
	this.emitters = [];

	if (callback) {
		callback.call(this);
	}

	return this.trigger('initialize');
};

Jmvc.prototype.retain = function () {
	this.retainCount++;
	return this.trigger('retain');
};

Jmvc.prototype.release = function () {
	if (this.retainCount === 0) {
		return this.terminate();
	}

	this.retainCount--;
	return this.trigger('release');
};

Jmvc.prototype.terminate = function () {
	this.off();
	this.stopListeningTo();

	return this.trigger('terminate');
};

Jmvc.prototype.callback = function (callback) {
	callback(this);
	return this;
};

Jmvc.prototype.on = function (event, callback, once = false, owner = this) {
	const process = (event) => {
		if (!this.events[event]) {
			this.events[event] = {
				callbacks: []
			};

			if (this.context instanceof EventTarget) {
				this.events[event].listener = {
					handleEvent: (...args) => {
						this.trigger(event, ...args);
					}
				};
				this.context.addEventListener(event, this.events[event].listener);
			}
		}

		this.events[event].callbacks.push({ event, callback, once, owner });

		if (owner !== this && owner.emitters.indexOf(this) === -1) {
			owner.emitters.push(this);
		}
	};

	const events = event.split(' ').filter((event) => event);
	for (let index = 0, length = events.length; index < length; index++) {
		process(events[index]);
	}

	return this;
};

Jmvc.prototype.off = function (eventArg, callbackArg, onceArg, ownerArg) {
	const removedOwners = [];

	const process = (event) => {
		let index = 0;
		while (index < this.events[event].callbacks.length) {
			const { callback, once, owner } = this.events[event].callbacks[index];
			if ((callbackArg == null || callbackArg === callback)
				&& (onceArg == null || onceArg === once)
				&& (ownerArg == null || ownerArg === owner)) {

				if (removedOwners.indexOf(owner) === -1) {
					removedOwners.push(owner);
				}

				this.events[event].callbacks.splice(index, 1);

				continue;
			}

			index++;
		}

		if (index === 0) {
			if (this.events[event].listener) {
				this.context.removeEventListener(event, this.events[event].listener);
			}

			delete this.events[event];
		}
	};

	if (eventArg != null) {
		const events = eventArg.split(' ').filter((event) => event && this.events[event]);
		for (let index = 0, length = events.length; index < length; index++) {
			process(events[index]);
		}
	} else {
		for (const event in this.events) {
			process(event);
		}
	}

	removeOwnersLoop:
	for (let index = 0, length = removedOwners.length; index < length; index++) {
		for (const key in this.events) {
			if (!this.events[key].callbacks.every((callback) => callback.owner !== ownerArg)) {
				continue removeOwnersLoop;
			}
		}

		const thisIndex = removedOwners[index].emitters.indexOf(this);
		removedOwners[index].emitters.splice(thisIndex, 1);
	}

	return this;
};

Jmvc.prototype.trigger = function (event, ...args) {
	const callbacks = [];

	const events = event.split(' ').filter((event) => event && this.events[event]);
	for (let eventsIndex = 0, length = events.length; eventsIndex < length; eventsIndex++) {
		callbacks.push(...this.events[events[eventsIndex]].callbacks);
	}

	for (let index = 0, length = callbacks.length; index < length; index++) {
		const callbackItem = callbacks[index];
		if (index === callbacks.indexOf(callbackItem)) {
			const { callback, owner } = callbackItem;
			callback.call(owner, ...args);
		}
	}

	return this.off(event, null, true);
};

Jmvc.prototype.listenTo = function (other, event, callback, once) {
	other.on(event, callback, once, this);
	return this;
};

Jmvc.prototype.stopListeningTo = function (other, event, callback, once) {
	if (other != null) {
		other.off(event, callback, once, this);
	} else {
		for (let index = 0, length = this.emitters.length; index < length; index++) {
			this.emitters[index].off(event, callback, once, this);
		}
	}

	return this;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MODEL
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(() => {
	function setModelProperty(instance, property) {
		const value = instance.context[property];
		const jvalue = value instanceof Jmvc.Model
			? value.retain()
			: value && typeof value === 'object'
				? Array.isArray(value)
					? new Jmvc.Model.Collection(value)
					: new Jmvc.Model(value)
				: false;

		if (jvalue) {
			instance.models[property] = jvalue;
			instance.listenTo(jvalue, 'change', function () {
				instance.trigger('change');
			});
		}
	}

	function unsetModelProperty(instance, property) {
		if (property in instance.models) {
			instance.stopListeningTo(instance.models[property].release(), 'change');
			delete instance.models[property];
		}
	}

	Jmvc.Model = function (context = {}, callback) {
		if (!(this instanceof Jmvc.Model)) {
			return new Jmvc.Model(context);
		}

		Jmvc.call(this, context, () => {
			this.models = {};

			for (const property in this.context) {
				setModelProperty(this, property);
			}

			if (callback) {
				callback.call(this);
			}
		});
	};

	Jmvc.Model.prototype = Object.create(Jmvc.prototype);
	Jmvc.Model.prototype.constructor = Jmvc.Model;

	Jmvc.Model.prototype.terminate = function () {
		for (const property in this.models) {
			unsetModelProperty(this, property);
		}

		return Jmvc.prototype.terminate.call(this);
	};

	Jmvc.Model.prototype.get = function (property) {
		const value = this.context[property];
		if (property in this.models) {
			return this.models[property];
		}

		return value;
	};

	Jmvc.Model.prototype.set = function (property, value) {
		unsetModelProperty(this, property);

		if (value === undefined) {
			delete this.context[property];
		} else {
			this.context[property] = value;
		}

		setModelProperty(this, property);

		this.trigger(`change:${property}`);
		this.trigger('change');

		return this;
	};

	Jmvc.Model.prototype.unset = function (property) {
		return this.set(property);
	};

	(() => {
		function mutateWith(instance, mutator, ...args) {
			Array.prototype[mutator].call(instance.context, ...args);

			const cleanModels = {};
			for (const property in instance.models) {
				const model = instance.models[property];
				if (!(model in instance.context)) {
					unsetModelProperty(instance, property);
				} else {
					cleanModels[instance.context.indexOf(model)] = model;
				}
			}

			instance.models = cleanModels;

			for (let index = 0, length = instance.context.length; index < length; index++) {
				if (!(instance.context[index] in instance.models)) {
					setModelProperty(instance, index);
				}
			}

			return instance.trigger('change');
		}

		Jmvc.Model.Collection = function (context = [], callback) {
			if (!(this instanceof Jmvc.Model.Collection)) {
				return new Jmvc.Model.Collection(context);
			}

			Jmvc.Model.call(this, context, callback);
		};

		Jmvc.Model.Collection.prototype = Object.create(Jmvc.Model.prototype);
		Jmvc.Model.Collection.prototype.constructor = Jmvc.Model.Collection;

		Jmvc.Model.Collection.prototype.copyWithin = function (...args) {
			return mutateWith(this, 'copyWithin', ...args);
		};

		Jmvc.Model.Collection.prototype.fill = function (...args) {
			return mutateWith(this, 'fill', ...args);
		};

		Jmvc.Model.Collection.prototype.pop = function (...args) {
			return mutateWith(this, 'pop', ...args);
		};

		Jmvc.Model.Collection.prototype.push = function (...args) {
			return mutateWith(this, 'push', ...args);
		};

		Jmvc.Model.Collection.prototype.reverse = function (...args) {
			return mutateWith(this, 'reverse', ...args);
		};

		Jmvc.Model.Collection.prototype.shift = function (...args) {
			return mutateWith(this, 'shift', ...args);
		};

		Jmvc.Model.Collection.prototype.sort = function (...args) {
			return mutateWith(this, 'sort', ...args);
		};

		Jmvc.Model.Collection.prototype.splice = function (...args) {
			return mutateWith(this, 'splice', ...args);
		};
	})();
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// VIEW
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(() => {
	function cleanup(instance) {
		if (instance.model) {
			instance.stopListeningTo(instance.model, 'change');
			instance.model.release();
			instance.model = null;
		}
	}

	Jmvc.View = function (element, jmodel, callback) {
		if (!(this instanceof Jmvc.View)) {
			return new Jmvc.View(element, jmodel, callback);
		}

		element = typeof element === 'string' ? document.createElement(element) : element;
		Jmvc.call(this, element, () => {
			this.attributes = {};
			if (this.context.hasAttributes()) {
				for (let index = 0, length = this.context.attributes.length; index < length; index++) {
					const { name, value } = this.context.attributes[index];
					this.attributes[name] = value;
				}
			}

			this.children = [];
			if (this.context.hasChildNodes()) {
				for (let index = 0, length = this.context.childNodes.length; index < length; index++) {
					this.children.push(this.context.childNodes[index]);
				}
			}

			this.setModel(jmodel);

			if (callback) {
				callback.call(this);
			}
		});
	};

	Jmvc.View.prototype = Object.create(Jmvc.prototype);
	Jmvc.View.prototype.constructor = Jmvc.View;

	Jmvc.View.prototype.terminate = function () {
		cleanup(this);

		for (let index = 0, length = this.children; index < length; index++) {
			if (this.children[index] instanceof Jmvc.View) {
				this.children[index].release();
			}
		}

		return Jmvc.prototype.terminate.call(this);
	};

	Jmvc.View.prototype.setAttributes = function (attributes) {
		this.attributes = attributes;

		this.trigger('change:attributes');
		this.trigger('change');

		return this;
	};

	Jmvc.View.prototype.setChildren = function (children) {
		for (let index = 0, length = this.children; index < length; index++) {
			if (this.children[index] instanceof Jmvc.View) {
				this.children[index].release();
			}
		}

		this.children = children;

		this.trigger('change:children');
		this.trigger('change');

		return this;
	};

	Jmvc.View.prototype.renderAttributes = function (callback) {
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

		return this.trigger('render:attributes', promises);
	};

	Jmvc.View.prototype.renderChildren = function (callback) {
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

			if (children instanceof Jmvc.View) {
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

		return this.trigger('render:children', promises);
	};

	Jmvc.View.prototype.render = function (callback) {
		const promises = [];

		this.renderAttributes((renderPromises) => promises.push(...renderPromises));
		this.renderChildren((renderPromises) => promises.push(...renderPromises));

		if (callback) {
			callback(promises);
		}

		return this.trigger('render', promises);
	};

	Jmvc.View.prototype.appendTo = function (target) {
		if (target instanceof Jmvc.View) {
			target = target.context;
		}

		target.append(this.context);

		return this;
	};

	Jmvc.View.prototype.setModel = function (jmodel = new Jmvc.Model()) {
		console.log('SET MODEL', jmodel);

		cleanup(this);

		this.model = jmodel;
		this.listenTo(this.model, 'change', () => this.render());

		return this;
	};
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// STYLE
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(() => {
	Jmvc.View.Style = function (jmodel, callback) {
		if (!(this instanceof Jmvc.View.Style)) {
			return new Jmvc.View.Style(jmodel, callback);
		}

		Jmvc.View.call(this, 'style', jmodel, () => {
			this.setChildren(() => {
				return Object.keys(this.model.context).reduce((acc, cur) => {
					acc.push(cur, '{');

					const style = this.model.context[cur];
					for (const key in style) {
						acc.push(`${key}:${style[key]};`);
					}

					acc.push('}');

					return acc;
				}, []);
			}).appendTo(document.head);

			if (callback) {
				callback.call(this);
			}
		});
	};

	Jmvc.View.Style.prototype = Object.create(Jmvc.View.prototype);
	Jmvc.View.Style.prototype.constructor = Jmvc.View.Style;
})();

/* exported Jmvc */
