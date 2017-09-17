import React, { Component } from 'react'
import { Button, Input } from 'antd'
import enhanceWithClickOutside from 'react-click-outside'
const { TextArea } = Input

class EditableText extends Component {
  state = {
    editing: false,
    newVal: undefined
  }

  onChange = e => this.setState({ newVal: e.target.value })
  editOn = () => this.setState({ editing: true })
  handleClickOutside = () => this.setState({ editing: false })
  onSave = attr => () => {
    this.setState({ editing: false })
    this.props.onSave([ attr, this.state.newVal ])
  }

  render = () => {
    const result = (
      <div onDoubleClick={this.editOn} style={{whiteSpace: 'pre-wrap'}}>
        {this.state.editing
          ? <div>
              {this.props.textarea
                ? <TextArea
                    rows={5}
                    onChange={this.onChange}
                    defaultValue={this.props.value}
                    ref={r => (this.ref = r)}
                  />
                : <Input
                    style={{width: 250}}
                    onChange={this.onChange}
                    defaultValue={this.props.value}
                    onPressEnter={this.onSave(this.props.attr)}
                    ref={r => (this.ref = r)}
                  />}
              <Button
                icon="save"
                type="primary"
                onClick={this.onSave(this.props.attr)}
              />
            </div>
          : <span>
              {this.props.value || "No Value"}
            </span>}
      </div>
    )
    return result
  }
}

export default enhanceWithClickOutside(EditableText)
