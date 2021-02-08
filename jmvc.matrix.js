/* global jmvc */

jmvc.view.modelview.matrix = function (collection = jmvc.model.collection()) {
	return Object.assign(jmvc.view.modelview('table', collection), {
		rows: []
	}, jmvc.view.modelview.matrix.methods).on('terminate', function () {
		this.cleanup();
	}).callback(function () {
		this
			.setAttributes({
				'class': 'matrix'
			})
			.setChildren([
				jmvc.view('tbody')
					.setChildren(() => {
						this.cleanup();
						return this.rows = this.model.context.map((value) => jmvc.view('tr')
							.retain()
							.setChildren(value.map((value) => jmvc.view('td')
								.setChildren([value]))));
					})
			]);

		if (!jmvc.view.modelview.matrix.initialized) {
			jmvc.view.modelview.matrix.initialized = true;

			jmvc.view.modelview.style(jmvc.model({
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
				.retain()
				.render()
				.release();
		}
	});
};

jmvc.view.modelview.matrix.methods = {
	cleanup() {
		for (let index = 0, length = this.rows.length; index < length; index++) {
			this.rows[index].release();
		}
	}
};

jmvc.view.modelview.matrix.initialized = false;
