/**
 * FolderPicker.jsx — choose the documents folder once.
 *
 * `webkitdirectory` is set through a ref rather than as a JSX prop: React
 * lower-cases unknown attributes inconsistently across versions, and a
 * silently-dropped attribute here turns a folder picker back into a file
 * picker with no visible sign that it happened.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, FolderOpen, FolderSearch } from 'lucide-react';
import { useLocalLibrary } from '../../context/LocalLibraryContext.jsx';

export function FolderPicker({ compact = false, expectedFolder = 'AWS-Career-Documents' }) {
  const inputRef = useRef(null);
  const { addFiles, clear, count, folderLabel, ready } = useLocalLibrary();
  const [justAdded, setJustAdded] = useState(0);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.setAttribute('webkitdirectory', '');
    el.setAttribute('directory', '');
    el.setAttribute('mozdirectory', '');
  }, []);

  const onPick = (event) => {
    const { added } = addFiles(event.target.files);
    event.target.value = '';
    setJustAdded(added);
    setTimeout(() => setJustAdded(0), 2500);
  };

  const button = (
    <>
      <button onClick={() => inputRef.current?.click()} className="btn btn-ghost !text-[11px] !py-1.5 inline-flex items-center gap-1.5">
        <FolderSearch size={12} />
        {ready ? 'Choose a different folder' : 'Open my documents folder'}
      </button>
      <input ref={inputRef} type="file" multiple onChange={onPick} className="hidden" />
    </>
  );

  if (compact) return button;

  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <FolderOpen size={15} className="text-aws-orange mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm">
            {ready ? 'Your documents are open' : 'Open your documents folder'}
          </h3>
          {ready ? (
            <p className="text-[11.5px] text-muted mt-1">
              {count} file{count === 1 ? '' : 's'} from <strong className="text-current">{folderLabel || 'your folder'}</strong>.
              Every document below opens straight away now, with nothing more to choose.
            </p>
          ) : (
            <p className="text-[11.5px] text-muted mt-1">
              This app has no server and cannot read your drive on its own. Choose the folder
              your documents are in — <strong className="text-current">{expectedFolder}</strong> on your
              Desktop holds all of them — and every document here opens with one click.
              Nothing is uploaded or saved.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {button}
            {ready && (
              <button onClick={clear} className="text-[11px] font-bold text-muted hover:text-aws-orange">
                Forget them
              </button>
            )}
            {justAdded > 0 && (
              <span className="text-[11px] text-success inline-flex items-center gap-1">
                <Check size={11} /> {justAdded} file{justAdded === 1 ? '' : 's'} read
              </span>
            )}
          </div>
          {/* Two things about this dialog trip people up every time, and
              neither is obvious from inside it. It lists only folders, so
              a folder of documents looks empty and reads as a failure. And
              it opens at Downloads, which is rarely where anything is. */}
          {!ready && (
            <div className="text-[10.5px] text-muted mt-2 space-y-1">
              <p>
                <strong className="text-current">The dialog will look empty — that is normal.</strong>{' '}
                It lists folders only, never files, so a folder full of documents shows nothing at all.
                Open the folder, check its name is in the <strong className="text-current">Folder:</strong> box,
                and press Upload anyway.
              </p>
              <p>
                It opens at Downloads. You can paste a full path into that same box instead of
                browsing — or pick one folder, then another; they add up.
              </p>
            </div>
          )}
          {ready && (
            <p className="text-[10.5px] text-muted mt-2">
              Held for this tab only — reloading the page asks again. You can add another
              folder and both stay open.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
