/* global Jmvc */

(() => {
	let initialized = false;
	let idCounter = 0;

	Jmvc.View.ModelView.FormField = function (jmodel = new Jmvc.Model(), callback) {
		if (!(this instanceof Jmvc.View.ModelView.FormField)) {
			return new Jmvc.View.ModelView.FormField(jmodel, callback);
		}

		Jmvc.View.ModelView.call(this, 'div', jmodel, () => {
			this
				.setAttributes({
					'class': 'form-field',
					'id': () => {
						if (this.model.context.id == null) {
							this.model.context.id = `form-field-${idCounter++}`;
						}
						return `${this.model.context.id}-wrapper`;
					}
				})
				.setChildren([
					new Jmvc.View('label')
						.setAttributes({ 'for': () => this.model.context.id })
						.setChildren(() => this.model.context.label || 'Unlabeled')
				]);

			if (!initialized) {
				initialized = true;

				new Jmvc.View.ModelView.Style(new Jmvc.Model({
					'div.form-field': {
						'font-size': '1rem',
						'line-height': '1.5',
						'margin': '1.5rem 0'
					},
					'div.form-field label': {
						'display': 'block'
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

	Jmvc.View.ModelView.FormField.prototype = Object.create(Jmvc.View.ModelView.prototype);
	Jmvc.View.ModelView.FormField.prototype.constructor = Jmvc.View.ModelView.FormField;
})();

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TEXT FORM FIELD
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(() => {
	let initialized = false;

	Jmvc.View.ModelView.FormField.Text = function (jmodel, callback) {
		if (!(this instanceof Jmvc.View.ModelView.FormField.Text)) {
			return new Jmvc.View.ModelView.FormField.Text(jmodel, callback);
		}

		Jmvc.View.ModelView.FormField.call(this, jmodel, () => {
			this
				.setChildren([
					...this.children,
					new Jmvc.View('input')
						.setAttributes({
							id: () => this.model.context.id,
							name: () => this.model.context.id,
							placeholder: () => this.model.context.placeholder,
							type: 'text'
						})
				]);


			if (!initialized) {
				initialized = true;

				new Jmvc.View.ModelView.Style(new Jmvc.Model({
					'div.form-field input': {
						'background-color': '#ffffff',
						'border': '1px solid #ced4da',
						'border-radius': '.25rem',
						'box-sizing': 'border-box',
						'color': '#212529',
						'display': 'block',
						'font-family': 'inherit',
						'font-size': '1rem',
						'font-weight': '400',
						'line-height': '1.5',
						'margin': '0',
						'padding': '.375rem .75rem',
						'width': '100%'
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

	Jmvc.View.ModelView.FormField.Text.prototype = Object.create(Jmvc.View.ModelView.FormField.prototype);
	Jmvc.View.ModelView.FormField.Text.prototype.constructor = Jmvc.View.ModelView.FormField.Text;
})();
