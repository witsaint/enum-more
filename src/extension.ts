// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const parser = require('@babel/parser');
const traverse = require("@babel/traverse").default;
const path = require('path');
const fs = require('fs');

/**
 * 处理焦点触发行对应代码
 * @param sourceStr 源代码行字符串
 * @returns 
 */
const handleEnumName = (sourceStr: string) => {
	if (!sourceStr) {
		return {};
	};
	const _str = sourceStr.trim();
	const _result = _str.split('.');
	const [enumName, property, attr] = _result || [];
	return {
		enumName,
		property,
		attr
	};
};

/**
 * hover 返回处理
 */
const handleHoverReturn = ( enumMap: any, enumName:any, property?: string, attr?: string) => {
	// 提示到 key val desc 层
	if (enumName && property && attr && enumMap[`${enumName}.${property}`]) {
		const _hoverResult = enumMap[`${enumName}.${property}`].find((_attr: any) => _attr?.label === attr);
		return _hoverResult?.documentation || undefined;
	}

	if (enumName && property && enumMap[enumName]) {
		const _hoverResult = enumMap[enumName].find((_propt: any) => _propt?.label === property);
		return _hoverResult?.documentation || undefined;
	}
};


/** 支持的语言类型 */
const LANGUAGES = ['typescriptreact', 'typescript', 'javascript', 'javascriptreact'];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const enumMap = Object.create({});

	/**
	 * 找到声明枚举的代码部分 进行处理
	 * @param sourceAst 
	 * @param enumName 
	 * @param mapEnumItemfn 
	 * @param parseAfterFn 
	 */
	const handleCodeStrToObj = (sourceAst: string, enumName: string, isImport: boolean, mapEnumItemfn: (key: string, val: string, desc:string) => void, parseAfterFn: () => void) => {
		// 包装枚举item 到输出配置
		const packEnumItem = (sourceToken: any) => {
			const args = sourceToken?.init?.arguments || [];
			const {elements} = args[0] || {};
			elements.forEach((element: any) => {
				const enumItemElements = element?.elements || [];
				if (enumItemElements && enumItemElements.length) {
					const [key, val, desc] = enumItemElements;
					const keyLabel = key?.value as string || '';
					const valLabel = val?.value as string || '';
					const descLabel = desc?.value as string || '';

					mapEnumItemfn(keyLabel, valLabel, descLabel);
					const attrConf = [
						{
							label: 'val',
							kind: 12,
							documentation: `${valLabel} [类型：${typeof valLabel}]`,
						},
						{
							label: 'key',
							kind: 12,
							documentation: keyLabel,
						},
						{
							label: 'desc',
							kind: 12,
							documentation: descLabel,
						}
					];
					// 记录属性
					
					enumMap[`${enumName}.${keyLabel}`] = attrConf;
					enumMap[`${enumName}.${valLabel}`] = attrConf;
				}
			});
		};

		const ExportNamedDeclaration = (dec: any) => {
			const { node } = dec || {};
			const declaration = node?.declaration?.declarations || [];
			if (declaration && declaration.length) {
				const sourceToken = declaration.find((item: any) => {
					return item?.id?.name === enumName;
				});
				const fnName = declaration[0]?.init?.callee?.name || '';
				
				if (sourceToken && fnName && fnName === 'enumer') {
					packEnumItem(sourceToken);
					parseAfterFn();
				}
			}
		};

		const VariableDeclarator = (dec: any) => {
			console.log('++ sourceToken', dec.node);
			const sourceToken = dec.node || {}
			packEnumItem(sourceToken);
			parseAfterFn();
		};

		const traverseparams = isImport ? { ExportNamedDeclaration }: { VariableDeclarator };
		
		traverse(sourceAst, traverseparams);
	};

	/**
	 * 
	 * @param text 当前文档内容
	 * @param enumName 枚举变量名
	 * @returns 
	 */
	const getImportLine = (text: string, enumName: string) => {
		// 获取文档中 import的部分
		const pattern = /import\s(.|\n)*?;\s/g;
		const matchresult = text.match(pattern);
		return matchresult?.find((importLine) => {
			return importLine.indexOf(enumName) > -1;
		});
	};

	const getConst = (text: string, enumName: string) => {
		const pattern = `const\\s${enumName}\\s= enumer\\((.*?|\\s)+?\\)`;
		const matchresult = text.match(new RegExp(pattern));
		console.log('++ matchresult', matchresult);
		return matchresult?.find((con) => {
			return con.indexOf(enumName) > -1;
		});
	};

	/**
	 * 获取用户写入的枚举字符串 eg Status.open
	 * @param document 
	 * @param position 
	 * @param isHover 
	 * @returns 
	 */
	const getSourceDeclarStr = (document: vscode.TextDocument, position: vscode.Position, isHover?: boolean) => {
		const leftRange = new vscode.Range(new vscode.Position(position.line, 0), position);
			const rightRange = new vscode.Range(position, new vscode.Position(position.line, 100));

			// 匹配 有效变量  为了匹配 需要在变量后面加个空格 比如 '{status}' 需要用 '{status} '来匹配
			const avoidpattern = /(\d|\w|\.)+(?:\.|\s|\W|})/g;
			const targetLeftText = document.getText(leftRange);
			const metchResult = (`${targetLeftText} `).match(avoidpattern) || [''];
			let _leftMathTxt = metchResult ? metchResult[metchResult.length - 1] : '';
			// 获取当前枚举完整字符串 eg Status.success
			let sourceTxt = _leftMathTxt.substr(0, _leftMathTxt.length - 1);
			console.log('++ sourceTxt:::', sourceTxt);
			
			if (isHover) {
				_leftMathTxt = _leftMathTxt?.trim();
				let targetRightText = document.getText(rightRange);
				const avoidRightpattern = /(\d|\w)+(?:\.|\s|\W|})/g;
				const [_rightMathTxt] = (`${targetRightText} `).match(avoidRightpattern) || [];
				targetRightText = _rightMathTxt ? _rightMathTxt.substr(0, _rightMathTxt.length - 1) : '';
				const realRext = `${_leftMathTxt}${targetRightText}`;
				sourceTxt = realRext.substr(0, realRext.length);
			}
			return sourceTxt;
	};

	const parseByImport = (sourceImport: string, enumName: string, document: vscode.TextDocument, parseAfterFn: (ast: any) => void) => {
		// → 解析代码字符串
		const importAst = parser.parse(sourceImport, {
			sourceType: 'script', // module unambigious
			plugins: ['jsx', 'typescript'],
			errorRecovery: true,
		});
		let targetCode = '';
		
		traverse(importAst, {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			ImportDeclaration(dec: any) {
				const { node } = dec || {};
				if (node) {
					const dirname = path.dirname(document.uri.path);
					//转换当前文件的绝对路径
					const absPath = path.join(dirname, node.source.value);
					const specifier = node.specifiers || [];
					
					const hasImport = specifier.find((item: any) => {
						return item?.imported?.name === enumName;
					});
					if (hasImport) {
						//读取入口文件内容
						targetCode = fs.readFileSync(`${absPath}.ts`, 'utf-8');
						const sourceAst = parser.parse(targetCode, {
							sourceType: 'script', // module unambigious
							plugins: ['jsx', 'typescript'],
							errorRecovery: true,
						});
						parseAfterFn(sourceAst);
					}
				}
				return null;
			}
		});
	};

	/**
	 * 代码提示公共逻辑
	 * @param document 
	 * @param position 
	 * @param token 
	 * @param context 
	 * @param isHover 
	 * @returns 
	 */
	const common = async (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context?: vscode.CompletionContext, isHover?: boolean) => {
			console.log('++ begin');
			
			const sourceTxt = getSourceDeclarStr(document, position, isHover);
			const {
				enumName,
				property,
				attr,
			} = handleEnumName(sourceTxt);
			console.group('++ Enum info:');
			console.log('++ sourceTxt:', sourceTxt);
			console.log('++ enumName:', enumName);
			console.log('++ property:', property);
			console.log('++ attr:', attr);
			console.groupEnd();
			if (!enumName) {
				return;
			};
			const sourceEnumConf:vscode.CompletionItem[] = [];
			let hoverConf = '';
			if (isHover) {
				hoverConf = handleHoverReturn(enumMap, enumName, property, attr);
				console.log('++ _hoverResult---', hoverConf);
				if (hoverConf) {
					return hoverConf || '';
				}
			}
			
			// 缓存
			// if (enumMap[`${enumName}.${property}`]) {
			// 	return enumMap[`${enumName}.${property}`];
			// }
			if (enumMap[enumName]) {
				return enumMap[enumName];
			}
			const text = document.getText();
			const projectPath = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.path;
			
			// 获取文档中 import的部分
			const sourceImport = getImportLine(text, enumName);
			const constStr = getConst(text, enumName);
			console.log('++ sourceImport::::', sourceImport);
			console.log('++ constStr::::', constStr);

			// 转换出 展示面板的内容
			const transformShowPanel = (str: string, isImport: boolean) => {
				const sourceAst = parser.parse(str, {
					sourceType: 'script', // module unambigious
					plugins: ['jsx', 'typescript'],
					errorRecovery: true,
				});
				
				handleCodeStrToObj(sourceAst, enumName, isImport, (keyLabel: string, valLabel: string, descLabel: string) => {
					if (keyLabel !== undefined) {
						sourceEnumConf.push({
							label: `${keyLabel}`,
							kind: 12,
							documentation: `val: ${valLabel}  desc: ${descLabel}`,
						});
					}
				}, () => {
					enumMap[enumName] = sourceEnumConf;
					if (isHover) {
						hoverConf = handleHoverReturn(enumMap, enumName, property, attr);
						console.log('++ _hoverResult;::::>>>', hoverConf);
					}
				});
			};

			// 当前文件声明
			if (constStr) {
				try {
					transformShowPanel(constStr, false);
				} catch (error) {
					return isHover ? '' :[];
				}
			}

			if (sourceImport) {
				try {
					// → 解析代码字符串
					const importAst = parser.parse(sourceImport, {
						sourceType: 'script', // module unambigious
						plugins: ['jsx', 'typescript'],
						errorRecovery: true,
					});
					let targetCode = '';
					
					traverse(importAst, {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						ImportDeclaration(dec: any) {
							const { node } = dec || {};
							if (node) {
								const dirname = path.dirname(document.uri.path);
								//转换当前文件的绝对路径
								const absPath = path.join(dirname, node.source.value);
								const specifier = node.specifiers || [];
								
								const hasImport = specifier.find((item: any) => {
									return item?.imported?.name === enumName;
								});
								if (hasImport) {
									//读取入口文件内容
									targetCode = fs.readFileSync(`${absPath}.ts`, 'utf-8');
									transformShowPanel(targetCode, true);
								}
							}
						}
					});
				} catch (error) {
					// console.log('++ error', error);
					return isHover ? '' :[];
				}
			}
			
			console.log('++ _hoverResult;::::]]]]]', hoverConf);
			return isHover ? hoverConf : sourceEnumConf;
	};

	const completionProvider = vscode.languages.registerCompletionItemProvider(LANGUAGES, {
		async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
			return await common(document, position, token, context);
		}
	}, '.');

	const hoverProvider = vscode.languages.registerHoverProvider(LANGUAGES, {
		async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
			const conf = await common(document, position, token, undefined, true);
			return new vscode.Hover(conf);
		}
	});

	context.subscriptions.push(completionProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
