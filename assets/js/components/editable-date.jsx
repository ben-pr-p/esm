import React, { Component } from 'react'
import { Modal, DatePicker, TimePicker } from 'antd'
import moment from 'moment'
import mtz from 'moment-timezone'

const friendly = {
  start_date: 'Starting Date and Time',
  end_date: 'Ending Date and Time'
}

export default class EditableDate extends Component {
  state = {
    editing: false,
    newDate: undefined,
    newTime: undefined
  }

  componentWillMount () {
    this.state.newDate = moment(this.props.value)
    this.state.newTime = moment(this.props.value)
  }

  onDateChange = newDate => this.setState({newDate})
  onTimeChange = newTime => this.setState({newTime})

  onChange = e => this.setState({ newVal: e.target.value })
  editOn = () => this.setState({ editing: true })
  handleClickOutside = () => this.setState({ editing: false })
  onSave = attr => () => {
    this.setState({ editing: false })

    const { newTime } = this.state
    const newDateTime = this.state.newDate

    newDateTime.hours(newTime.hours())
    newDateTime.minutes(newTime.minutes())

    this.props.onSave([attr, newDateTime.toISOString()])
  }

  render = () => {
    const as_moment = mtz.tz(this.props.value, this.props.time_zone)

    return (
      <div onDoubleClick={this.editOn}>
        <Modal
          title={`Edit ${friendly[this.props.attr]}`}
          visible={this.state.editing}
          onOk={this.onSave(this.props.attr)}
          onCancel={this.handleClickOutside}
        >
          <strong> Date: </strong>
          <DatePicker
            defaultValue={as_moment}
            onChange={this.onDateChange}
          />
          <br/>
          <br/>
          <strong> Time: </strong>
          <TimePicker
            defaultOpenValue={as_moment}
            onChange={this.onTimeChange}
            use12Hours={true}
          />
        </Modal>

        {mtz(this.props.value)
          .tz(this.props.time_zone)
          .format('dddd, MMMM Do YYYY, h:mm a')}
      </div>
    )
  }
}
