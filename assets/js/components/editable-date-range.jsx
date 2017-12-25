import React, { Component } from 'react'
import { Modal, DatePicker, TimePicker } from 'antd'
import moment from 'moment-timezone'

const friendly = {
  start_date: 'Starting Date and Time',
  end_date: 'Ending Date and Time'
}

export default class EditableDate extends Component {
  state = {
    editing: false,
    newDate: undefined,
    newStart: undefined,
    newEnd: undefined
  }

  componentWillMount() {
    this.state.newDate = moment(this.props.value)
    this.state.newStart = moment(this.props.value)
    this.state.newEnd = moment(this.props.value)
  }

  onDateChange = newDate => this.setState({ newDate })
  onStartChange = newStart => this.setState({ newStart })
  onEndChange = newEnd => this.setState({ newEnd })

  onChange = e => this.setState({ newVal: e.target.value })

  editOn = () => {
    this.props.checkout()
    this.setState({ editing: true })
  }

  handleClickOutside = () => {
    this.props.checkin()
    this.setState({ editing: false })
  }

  onSave = attr => () => {
    this.setState({ editing: false })

    const combineDateAndTime = (date, time) => {
      date.hours(time.hours())
      date.minutes(time.minutes())
      return date
    }

    const { newDate, newStart, newEnd } = this.state
    const start_date = combineDateAndTime(newDate.clone(), newStart)
    const end_date = combineDateAndTime(newDate.clone(), newEnd)

    this.props.onSave([
      ['start_date', start_date.format()],
      ['end_date', end_date.format()]
    ])
  }

  render = () => {
    const start_moment = this.props.start_date
      ? moment(this.props.start_date)
      : null
    const end_moment = this.props.end_date
      ? moment(this.props.end_date)
      : null

    return (
      <div onDoubleClick={this.editOn}>
        <Modal
          title={`Edit ${friendly[this.props.attr]}`}
          visible={this.state.editing}
          onOk={this.onSave(this.props.attr)}
          onCancel={this.handleClickOutside}>
          <strong> Date: </strong>
          <DatePicker
            defaultValue={start_moment}
            onChange={this.onDateChange}
          />
          <br />
          <br />
          <strong> Start: </strong>
          <TimePicker
            defaultOpenValue={start_moment}
            onChange={this.onStartChange}
            use12Hours={true}
          />

          <strong> End: </strong>
          <TimePicker
            defaultOpenValue={end_moment}
            onChange={this.onEndChange}
            use12Hours={true}
          />
        </Modal>

        {start_moment.format('dddd, MMMM Do YYYY')}
        <br />
        <span style={{ userSelect: 'none' }}>
          {`From ${start_moment.format('HH:mm A')} to ${end_moment.format(
            'HH:mm A'
          )}`}
        </span>
      </div>
    )
  }
}
