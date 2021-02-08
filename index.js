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

// const collection = [];
// function populate() {
// 	for (let index = 0, length = 20000; index < length; index++) {
// 		collection.push(Math.random() * 1000);
// 	}
// }

// const view = jmvc.view()
// 	.retain()
// 	.setChildren([
// 		jmvc.view('p').setChildren([
// 			jmvc.view('button')
// 				.setChildren('Render')
// 				.on('click', () => {
// 					populate();
// 					view.render();
// 				}),
// 			' ',
// 			jmvc.view('button')
// 				.setChildren('Clear')
// 				.on('click', () => {
// 					collection.splice(0, collection.length);
// 					view.render();
// 				})
// 		]),
// 		() => collection.map((item) => [jmvc.view('span').setChildren(item), ' '])
// 	])
// 	.appendTo(app)
// 	.render();
