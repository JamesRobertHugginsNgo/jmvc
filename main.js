/* global jmvc */

const app = document.getElementById('app');

// const jmodel = jmvc({ id: 123 });

// jmvc(document.createElement('div'))
// 	.test(jmodel)
// 	.appendTo(app)
// 	.render();

const jcollection = jmvc([
	['DATA 0.0', 'DATA 0.1', 'DATA 0.2'],
	['DATA 1.0', 'DATA 1.1', 'DATA 1.2'],
	['DATA 2.0', 'DATA 2.1', 'DATA 2.2']
]);

jmvc(document.createElement('table'))
	.matrix(jcollection)
	.appendTo(app)
	.render();
