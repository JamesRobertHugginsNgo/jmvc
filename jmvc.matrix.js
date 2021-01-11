/* global jmvc */

jmvc.factories.matrix = (() => {
	let initialized = false;

	const initialize = () => {
		if (initialized) {
			return;
		}

		initialized = true;

		jmvc.view('style')
			.style(jmvc({
				'table.matrix': {
					'border-spacing': 0,
					'border-collapse': 'collapse',
					'width': '100%'
				},
				'table.matrix td, table.matrix th': {
					'border': '1px solid #cccccc',
					'padding': '0.5em 1rem'
				}
			}))
			.render()
			.appendTo(document.head);
	};

	function matrix(jCollection = jmvc([])) {
		initialize();

		jCollection = jmvc(jCollection)
			.on(jmvc.eventEnum.CHANGE, () => {
				this.render();
			})
			.on(jmvc.eventEnum.INDIRECT_CHANGE, () => {
				this.render();
			});

		this.setAttributes({ 'class': 'matrix' });

		this.setChildren([
			jmvc.view('tbody')
				.setChildren(function () {
					return jCollection.map((value) => {
						return jmvc.view('tr')
							.setChildren(value.map(value => {
								return jmvc.view('td')
									.setChildren([value]);
							}));
					});
				})
		]);

		return this;
	}

	return wrapper => {
		if (!jmvc.isValidView(wrapper.reference) || !(wrapper.reference instanceof HTMLTableElement)) {
			return;
		}

		Object.assign(wrapper, {
			matrix
		});
	};
})();
