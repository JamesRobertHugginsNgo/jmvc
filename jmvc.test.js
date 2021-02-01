/* global Jmvc */

(() => {
	let initialized = false;
	function initialize() {
		if (initialized) {
			return;
		}
		initialized = true;

		new Jmvc.View.Style(new Jmvc.Model({
			'div.test': {
				'background-color': '#dff9fb',
				'border': '1px dashed #666666',
				'border-radius': '0.4rem',
				'font-size': '1rem',
				'line-height': '1.5',
				'margin': '1.5rem 0',
				'padding': '1.5rem'
			},
			'div.test button': {
				'font-size': '1rem',
				'line-height': '1.5'
			}
		}))
			.render()
			.release();
	}

	Jmvc.View.Test = function (jmodel, callback) {
		if (!(this instanceof Jmvc.View.Test)) {
			return new Jmvc.View.Test(jmodel, callback);
		}

		Jmvc.View.call(this, 'div', jmodel, () => {
			this
				.setAttributes({
					'class': 'test',
					'data-id': () => this.model.context.id
				})
				.setChildren([
					new Jmvc.View('button')
						.retain()
						.setAttributes({ 'type': 'button' })
						.setChildren([() => `{{ ${this.model.context.id || 'EMPTY'} }}`])
						.on('click', () => this.model.set('id', Math.random() * 100))
				]);

			initialize();

			if (callback) {
				callback.call(this);
			}
		});
	};

	Jmvc.View.Test.prototype = Object.create(Jmvc.View.prototype);
	Jmvc.View.Test.prototype.constructor = Jmvc.View.Test;
})();
