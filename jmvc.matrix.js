/* global Jmvc */

(() => {
	let initialized = false;
	const initialize = () => {
		if (initialized) {
			return;
		}
		initialized = true;

		new Jmvc.View.Style()
			.setModel(new Jmvc.Model({
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
	};

	Jmvc.View.Matrix = function () {
		if (!(this instanceof Jmvc.View.Matrix)) {
			return new Jmvc.View.Matrix();
		}

		Jmvc.View.call(this, 'table', () => {
			let rows = [];
			this
				.setAttributes({ 'class': 'matrix' })
				.setChildren([
					new Jmvc.View('tbody')
						.setChildren(() => {
							for (let index = 0, length = rows.length; index < length; index++) {
								rows[index].release();
							}

							return rows = this.model.context.map((value) => new Jmvc.View('tr')
								.setChildren(value.map((value) => new Jmvc.View('td')
									.setChildren([value]))));
						})
				]);

			initialize();
		});
	};

	Jmvc.View.Matrix.prototype = Object.create(Jmvc.View.prototype);
	Jmvc.View.Matrix.prototype.constructor = Jmvc.View.Matrix;

	Jmvc.View.Matrix.prototype.setModel = function (jcollection = new Jmvc.Model.Collection()) {
		return Jmvc.View.prototype.setModel.call(this, jcollection);
	};
})();
