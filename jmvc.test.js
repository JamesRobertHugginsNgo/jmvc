/* global jmvc */

jmvc.factories.test = (() => {
	let initialized = false;

	const initialize = () => {
		if (initialized) {
			return;
		}

		initialized = true;

		jmvc.view('style')
			.style(jmvc({
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
			.appendTo(document.head);
	};

	function test(jModel = jmvc({})) {
		initialize();

		jModel = jmvc(jModel)
			.on(jmvc.eventEnum.CHANGE, () => {
				this.render();
			});

		this.setAttributes({
			'class': 'test',
			'data-id': () => jModel.get('id')
		});

		this.setChildren([
			jmvc.view('button')
				.setAttributes({
					'type': 'button'
				})
				.setChildren([
					() => jmvc.text('BEFORE [', jModel.get('id') || 'EMPTY', '] AFTER ')
				])
				.on('click', () => {
					jModel.set('id', Math.random() * 100);
				})
		]);

		return this;
	}

	return wrapper => {
		if (!jmvc.isValidView(wrapper.reference) || !(wrapper.reference instanceof HTMLDivElement)) {
			return;
		}

		Object.assign(wrapper, {
			test
		});
	};
})();
