import React, { Component } from 'react'
import { Input, Icon, Select, Button } from 'antd'

export default class Filter extends Component {
  state = {
    value: undefined,
    option: 'contains'
  }

  render() {
    const render_fn = this.renderFunctions[
      this.props.filterSpec[this.props.field].type
    ]
    return render_fn(this.props, this.state)
  }

  setValue = e => {
    this.state.value = e.target.value
    this.props.updateFilter(this.getFilterFn())
  }

  setOption = option => {
    this.state.option = option
    this.props.updateFilter(this.getFilterFn())
  }

  getFilterFn = () => event => {
    let value = get_in(event, this.props.field)
    value = value
      ? Array.isArray(value)
        ? JSON.stringify(value).toLowerCase()
        : value.toLowerCase()
      : value

    if (this.state.value == undefined) {
      return true
    }

    if (this.state.option == 'contains') {
      return value.includes(this.state.value.toLowerCase())
    } else if (this.state.option == 'does not contain') {
      return !value.includes(this.state.value.toLowerCase())
    }

    return false
  }

  renderString = (props, state) => {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 3,
          height: '75%',
          position: 'relative'
        }}>
        <span
          style={{
            color: 'white',
            fontSize: 'larger',
            textTransform: 'uppercase',
            padding: 3
          }}>
          {props.filterSpec[props.field].display}
        </span>
        <Input
          addonBefore={
            <Select
              defaultValue="contains"
              style={{ width: 80 }}
              onChange={this.setOption}>
              {['contains', 'does not contain'].map(v => (
                <Option value={v}>{v}</Option>
              ))}
            </Select>
          }
          onPressEnter={this.setValue}
          style={{ width: 200 }}
        />

        <Button
          onClick={props.deleteMe}
          shape="circle"
          icon="close"
          type="danger"
        />
      </div>
    )
  }

  renderFunctions = {
    string: this.renderString,
    date: this.renderDate
  }
}

const get_in = (map, key) => {
  if (key == undefined || key == '') {
    return map
  }

  const split = key.split('.')
  const part_0 = split[0]
  return get_in(map[part_0], split.slice(1).join('.'))
}
