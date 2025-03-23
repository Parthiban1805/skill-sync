from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import io
import traceback
import ast
import inspect
import uuid

app = Flask(__name__)
CORS(app)

class PythonTracer:
    def __init__(self, code, input_text=""):
        self.code = code
        self.input_text = input_text
        self.steps = []
        self.step_counter = 0
        self.current_line = 0
        self.call_stack = []
        self.variables = {}
        self.output_buffer = io.StringIO()
        self.input_buffer = io.StringIO(input_text)
        self.original_stdin = sys.stdin
        self.original_stdout = sys.stdout

    def trace_function(self, frame, event, arg):
        """Trace function that will be called for each execution step"""
        if event == 'line':
            # Get the source file of the current frame
            filename = frame.f_code.co_filename
            
            # Only trace our code, not built-in or library code
            if filename == '<string>':
                # Record the line number
                self.current_line = frame.f_lineno
                
                # Record variables in the current frame
                local_vars = {}
                for name, value in frame.f_locals.items():
                    # Skip special names and built-in functions
                    if not name.startswith('__') and not hasattr(value, '__call__'):
                        try:
                            # Attempt to make a JSON-serializable copy of the value
                            if isinstance(value, (int, float, str, bool, type(None))):
                                local_vars[name] = value
                            elif isinstance(value, (list, tuple)):
                                local_vars[name] = list(value)
                            elif isinstance(value, dict):
                                local_vars[name] = dict(value)
                            else:
                                # For other types, convert to string representation
                                local_vars[name] = str(value)
                        except:
                            # If conversion fails, store as string
                            local_vars[name] = str(value)
                
                # Record the current state
                call_stack_info = [{
                    'name': frame_info.f_code.co_name,
                    'line': frame_info.f_lineno
                } for frame_info in self.get_stack(frame)]
                
                self.steps.append({
                    'step': self.step_counter,
                    'line': self.current_line,
                    'variables': local_vars,
                    'callStack': call_stack_info
                })
                
                self.step_counter += 1
        
        # Continue tracing by returning this function
        return self.trace_function
    
    def get_stack(self, frame):
        """Get the call stack frames"""
        stack = []
        while frame:
            stack.append(frame)
            frame = frame.f_back
        # Return in reverse order (most recent call first)
        return stack[::-1]
    
    def run(self):
        """Run the code with tracing enabled"""
        sys.stdin = self.input_buffer
        sys.stdout = self.output_buffer
        
        result = None
        error = None
        
        try:
            # Set the trace function and execute the code
            sys.settrace(self.trace_function)
            
            # Execute the code
            compiled_code = compile(self.code, '<string>', 'exec')
            global_namespace = {}
            exec(compiled_code, global_namespace)
            
            result = self.output_buffer.getvalue()
        except Exception as e:
            error = f"Error: {str(e)}\n{traceback.format_exc()}"
        finally:
            # Reset the trace function and restore I/O
            sys.settrace(None)
            sys.stdin = self.original_stdin
            sys.stdout = self.original_stdout
        
        return {
            'steps': self.steps,
            'output': result,
            'error': error
        }

@app.route('/skill-sync/visualize', methods=['POST'])
def visualize_code():
    data = request.json
    code = data.get('code', '')
    input_text = data.get('input', '')
    
    if not code.strip():
        return jsonify({'error': 'No code provided'})
    
    try:
        # Run the code with our tracer
        tracer = PythonTracer(code, input_text)
        result = tracer.run()
        
        return jsonify({
            'steps': result['steps'],
            'output': result['output'],
            'error': result['error']
        })
    except Exception as e:
        return jsonify({'error': f"Server error: {str(e)}"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)