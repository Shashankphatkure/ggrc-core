/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Component from '../rich_text';
import {getComponentVM} from '../../../../js_specs/spec_helpers';

describe('richText component', ()=> {
  let viewModel;

  beforeEach(()=> {
    viewModel = getComponentVM(Component);
  });

  describe('viewModel', ()=> {
    describe('getLength() method', ()=> {
      let editor;

      beforeEach(()=> {
        editor = jasmine.createSpyObj(['getLength']);
      });

      it('should call getLength()', ()=> {
        viewModel.getLength(editor);

        expect(editor.getLength).toHaveBeenCalled();
      });

      it('should not return service symbol', ()=> {
        let length = 5;
        editor.getLength.and.returnValue(length);

        let result = viewModel.getLength(editor);

        expect(result).toBe(length -1);
      });
    });

    describe('urlMatcher() method', ()=> {
      it('should return delta if there are no matches', ()=> {
        let node = {
          data: 'sometext',
        };
        let delta = {
          ops: [{insert: 'sometext'}],
        };

        let result = viewModel.urlMatcher(node, delta);

        expect(result).toBe(delta);
        expect(result.ops.length).toBe(delta.ops.length);
        expect(result.ops[0]).toBe(delta.ops[0]);
      });

      it('should update delta if there are matches', ()=> {
        let node = {
          data: 'http://the.url and http://another.url ok?',
        };
        let delta = {
          ops: [{
            insert: 'http://the.url and http://another.url ok?',
          }],
        };

        let result = viewModel.urlMatcher(node, delta);

        expect(result.ops.length).toBe(4);
        expect(result.ops[0]).toEqual({
          insert: 'http://the.url',
          attributes: {
            link: 'http://the.url',
          },
        });
        expect(result.ops[1]).toEqual({
          insert: ' and ',
        });
        expect(result.ops[2]).toEqual({
          insert: 'http://another.url',
          attributes: {
            link: 'http://another.url',
          },
        });
        expect(result.ops[3]).toEqual({
          insert: ' ok?',
        });
      });
    });

    describe('restrictMaxLength() method', ()=> {
      let editor;

      beforeEach(()=> {
        editor = {
          root: jasmine.createSpyObj(['addEventListener']),
        };
      });

      it('should subscribe "keypress" event', ()=> {
        viewModel.restrictMaxLength(editor);

        expect(editor.root.addEventListener.calls.argsFor(0)[0])
          .toBe('keypress');
      });

      describe('keypress callback', ()=> {
        let event;
        let callback;

        beforeEach(()=> {
          event = jasmine.createSpyObj(['preventDefault']);
          editor.root.addEventListener.and.callFake((eventName, cb)=> {
            callback = cb;
          });
        });

        it(`should not call preventDefault if current 
          length is less than max length`, ()=> {
            viewModel.attr('maxLength', 10);
            spyOn(viewModel, 'getLength').and.returnValue(9);
            viewModel.restrictMaxLength(editor);

            callback(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
          });

        it(`should call preventDefault if current 
          length is greather than max length`, ()=> {
            viewModel.attr('maxLength', 9);
            spyOn(viewModel, 'getLength').and.returnValue(10);
            viewModel.restrictMaxLength(editor);

            callback(event);

            expect(event.preventDefault).toHaveBeenCalled();
          });
      });
    });

    describe('restrictPasteOperation() method', ()=> {
      let editor;

      beforeEach(()=> {
        editor = {
          root: jasmine.createSpyObj(['addEventListener']),
        };
      });

      it('should subscribe "paste" event', ()=> {
        viewModel.restrictPasteOperation(editor);

        expect(editor.root.addEventListener.calls.argsFor(0)[0]).toBe('paste');
      });

      describe('paste callback', ()=> {
        let event;
        let callback;

        beforeEach(()=> {
          event = {
            preventDefault: jasmine.createSpy(),
            clipboardData: {
              getData: jasmine.createSpy(),
            },
          };
          editor.root.addEventListener.and.callFake((eventName, cb)=> {
            callback = cb;
          });
          spyOn(document, 'execCommand');
        });

        describe('if pasted text length is less than allowed', ()=> {
          beforeEach(()=> {
            event.clipboardData.getData.and.returnValue('0123456789');
            viewModel.attr('maxLength', 20);
            viewModel.attr('length', 5);
            viewModel.restrictPasteOperation(editor);
          });

          it('should not call preventDefault', ()=> {
            callback(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
          });

          it('should not call execCommand', ()=> {
            callback(event);

            expect(document.execCommand).not.toHaveBeenCalled();
          });
        });

        describe('if pasted text length is greather than allowed', ()=> {
          beforeEach(()=> {
            event.clipboardData.getData.and.returnValue('0123456789');
            viewModel.attr('maxLength', 10);
            viewModel.attr('length', 5);
            viewModel.restrictPasteOperation(editor);
          });

          it('should call preventDefault', ()=> {
            callback(event);

            expect(event.preventDefault).toHaveBeenCalled();
          });

          describe('should call execCommand', ()=> {
            beforeEach(()=> {
              callback(event);
            });

            it('with correct command name', ()=> {
              expect(document.execCommand).toHaveBeenCalled();
              expect(document.execCommand.calls.argsFor(0)[0])
                .toBe('insertText');
            });

            it('with correct configuration', ()=> {
              expect(document.execCommand).toHaveBeenCalled();
              expect(document.execCommand.calls.argsFor(0)[1]).toBe(false);
            });

            it('with correctly sliced text', ()=> {
              expect(document.execCommand).toHaveBeenCalled();
              expect(document.execCommand.calls.argsFor(0)[2])
                .toBe('01234');
            });
          });

          it('should show alert', ()=> {
            viewModel.attr('showAlert', false);

            callback(event);

            expect(viewModel.attr('showAlert')).toBe(true);
          });
        });
      });
    });

    describe('onChange() method', ()=> {
      it('should reset "showAlert" flag if length is less than allowed', ()=> {
        viewModel.attr('showAlert', true);
        spyOn(viewModel, 'getLength').and.returnValue(99);
        viewModel.attr('maxLength', 100);
        viewModel.attr('editor', {
          root: {},
        });

        viewModel.onChange({ops: []});

        expect(viewModel.attr('showAlert')).toBe(false);
      });
    });
  });
});
