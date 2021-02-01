/* global Jmvc */

const app = document.getElementById('app');

const jmodel = new Jmvc.Model({
	id: 'New ID'
});

new Jmvc.View.Test(jmodel)
	.appendTo(app)
	.render();

const jcollection = new Jmvc.Model.Collection([
	['DATA 0.0', 'DATA 0.1', 'DATA 0.2'],
	['DATA 1.0', 'DATA 1.1', 'DATA 1.2'],
	['DATA 2.0', 'DATA 2.1', 'DATA 2.2']
]);

new Jmvc.View.Matrix(jcollection)
	.appendTo(app)
	.render();
