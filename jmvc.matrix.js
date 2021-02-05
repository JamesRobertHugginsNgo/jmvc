/* global Jmvc */

(() => {
	let initialized = false;

	function cleanup(instance) {
		for (let index = 0, length = instance.rows.length; index < length; index++) {
			instance.rows[index].release();
		}
	}

	Jmvc.View.ModelView.Matrix = function (jmodel, callback) {
		if (!(this instanceof Jmvc.View.ModelView.Matrix)) {
			return new Jmvc.View.ModelView.Matrix(jmodel, callback);
		}

		Jmvc.View.ModelView.call(this, 'table', jmodel, () => {
			this.rows = [];
			this
				.setAttributes({ 'class': 'matrix' })
				.setChildren([
					new Jmvc.View('tbody')
						.setChildren(() => {
							cleanup(this);
							return this.rows = this.model.context.map((value) => new Jmvc.View('tr')
								.setChildren(value.map((value) => new Jmvc.View('td')
									.setChildren([value]))));
						})
				]);

			if (!initialized) {
				initialized = true;

				new Jmvc.View.ModelView.Style(new Jmvc.Model({
					'table.matrix': {
						'border-spacing': 0,
						'border-collapse': 'collapse',
						'margin': '1.5rem 0',
						'width': '100%'
					},
					'table.matrix td, table.matrix th': {
						'border': '1px solid #cccccc',
						'padding': '0.5em 1rem'
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

	Jmvc.View.ModelView.Matrix.prototype = Object.create(Jmvc.View.ModelView.prototype);
	Jmvc.View.ModelView.Matrix.prototype.constructor = Jmvc.View.ModelView.Matrix;

	Jmvc.View.ModelView.Matrix.prototype.terminate = function () {
		cleanup(this);
		return Jmvc.View.ModelView.prototype.terminate.call(this);
	};
})();
