import React, { Component } from 'react'
import { Button, InputNumber } from 'antd'
import enhanceWithClickOutside from 'react-click-outside'

class EditableNumber extends Component {
  state = {
    editing: false,
    newVal: undefined
  }

  onChange = int => this.setState({ newVal: int})

  editOn = () => {
    this.props.checkout()
    this.setState({ editing: true })
  }

  handleClickOutside = () => {
    if (this.state.editing) {
      this.props.checkin()
      this.setState({ editing: false })
    }
  }

  onSave = attr => () => {
    this.setState({ editing: false })
    this.props.onSave([attr, this.state.newVal])
  }

  render = () => {
    const result = (
      <div onDoubleClick={this.editOn} style={{ whiteSpace: 'pre-wrap' }}>
        {this.state.editing ? (
          <div>
            <InputNumber
              style={{ width: 250 }}
              precision={5}
              onChange={this.onChange}
              defaultValue={this.props.value}
              onPressEnter={this.onSave(this.props.attr)}
              ref={r => (this.ref = r)}
            />
            <Button
              icon="save"
              type="primary"
              onClick={this.onSave(this.props.attr)}
            />
          </div>
        ) : (
          <span>{this.props.value || 'No Value'}</span>
        )}
      </div>
    )
    return result
  }
}

export default enhanceWithClickOutside(EditableNumber)
