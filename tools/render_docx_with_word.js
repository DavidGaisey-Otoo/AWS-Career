var fso = new ActiveXObject('Scripting.FileSystemObject');
var input = fso.GetAbsolutePathName(WScript.Arguments.Item(0));
var output = fso.GetAbsolutePathName(WScript.Arguments.Item(1));
var word = new ActiveXObject('Word.Application');
word.Visible = false;
word.DisplayAlerts = 0;
try {
  var doc = word.Documents.Open(input, false, true);
  doc.ExportAsFixedFormat(output, 17);
  doc.Close(false);
} finally {
  word.Quit();
}
