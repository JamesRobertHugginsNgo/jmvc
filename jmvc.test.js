/* global jmvc */

jmvc.view.modelview.test = function (model = jmvc.model()) {
	return Object(jmvc.view.modelview('div', model), jmvc.view.modelview.test.methods).callback(function () {
		this
			.setAttributes({
				'class': 'test',
				'data-id': () => this.model.context.id
			})
			.setChildren([
				jmvc.view('button')
					.setAttributes({ 'type': 'button' })
					.setChildren([() => `{{ ${this.model.context.id || 'EMPTY'} }}`])
					.on('click', () => this.model.set('id', Math.random() * 100))
			]);

		if (!jmvc.view.modelview.test.initialized) {
			jmvc.view.modelview.test.initialized = true;

			jmvc.view.modelview.style(jmvc.model({
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
					'cursor': 'pointer',
					'color': '#ffffff',
					'background-color': '#0d6efd',
					'border-color': '#0d6efd',
					'display': 'inline-block',
					'font-weight': 400,
					'line-height': 1.5,
					'text-align': 'center',
					'text-decoration': 'none',
					'vertical-align': 'middle',
					'user-select': 'none',
					'border': '1px solid transparent',
					'padding': '.375rem .75rem',
					'font-size': '1rem',
					'border-radius': '.25rem',
					'transition': 'color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out',
					'text-transform': 'none'
				},
				'div.test button:hover': {
					'color': '#fff',
					'background-color': '#0b5ed7',
					'border-color': '#0a58ca'
				}
			}))
				.retain()
				.render()
				.release();
		}
	});
};

jmvc.view.modelview.test.methods = {
	setModel(model) {
		return jmvc.view.modelview.methods.setModel.call(this, model, 'change:id');
	}
};

jmvc.view.modelview.test.initialized = false;
