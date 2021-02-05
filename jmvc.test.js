/* global Jmvc */

(() => {
	let initialized = false;

	Jmvc.View.ModelView.Test = function (jmodel, callback) {
		if (!(this instanceof Jmvc.View.ModelView.Test)) {
			return new Jmvc.View.ModelView.Test(jmodel, callback);
		}

		Jmvc.View.ModelView.call(this, 'div', jmodel, () => {
			this
				.setAttributes({
					'class': 'test',
					'data-id': () => this.model.context.id
				})
				.setChildren([
					new Jmvc.View('button')
						.setAttributes({ 'type': 'button' })
						.setChildren([() => `{{ ${this.model.context.id || 'EMPTY'} }}`])
						.on('click', () => this.model.set('id', Math.random() * 100))
				]);

			if (!initialized) {
				initialized = true;

				new Jmvc.View.ModelView.Style(new Jmvc.Model({
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

			if (callback) {
				callback.call(this);
			}
		});
	};

	Jmvc.View.ModelView.Test.prototype = Object.create(Jmvc.View.ModelView.prototype);
	Jmvc.View.ModelView.Test.prototype.constructor = Jmvc.View.ModelView.Test;

	Jmvc.View.ModelView.Test.prototype.setModel = function (jmodel) {
		return Jmvc.View.ModelView.prototype.setModel.call(this, jmodel, 'change:id');
	};
})();
