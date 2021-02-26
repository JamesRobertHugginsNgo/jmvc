/* global jmvc */

const app = document.getElementById('app');

jmvc.view.modelview.test()
	.retain()
	.appendTo(app)
	.render();

const collection = jmvc.model.collection([
	['DATA 0.0', 'DATA 0.1', 'DATA 0.2'],
	['DATA 1.0', 'DATA 1.1', 'DATA 1.2'],
	['DATA 2.0', 'DATA 2.1', 'DATA 2.2']
]);

jmvc.view.modelview.matrix(collection)
	.appendTo(app)
	.render();
